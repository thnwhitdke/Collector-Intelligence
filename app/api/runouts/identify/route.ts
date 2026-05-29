import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

function normalizeRunout(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function confidenceTier(score: number) {
  if (score >= 100) return "Exact";
  if (score >= 90) return "Very High";
  if (score >= 80) return "High";
  if (score >= 70) return "Possible Variant";
  return "Low";
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const sideA = String(body?.sideA ?? "").trim();
    const sideB = String(body?.sideB ?? "").trim();

    const inputs = [
      { side: "A", raw: sideA, normalized: normalizeRunout(sideA) },
      { side: "B", raw: sideB, normalized: normalizeRunout(sideB) },
    ].filter((item) => item.normalized.length > 0);

    if (inputs.length === 0) {
      return NextResponse.json({
        ok: false,
        message: "Enter at least one runout.",
        matches: [],
      });
    }

    const supabase = createAdminClient();

    const { data: identifiers, error } = await supabase
      .from("release_runout_identifiers")
      .select("*");

    if (error) {
      return NextResponse.json({
        ok: false,
        message: error.message,
        matches: [],
      });
    }

    const rawMatches = (identifiers ?? [])
      .flatMap((identifier) =>
        inputs.map((input) => {
          const known = String(identifier.normalized_value ?? "");

          let confidenceScore = 0;
          let confidenceLabel = "No Match";

          if (input.normalized === known) {
            confidenceScore = 100;
            confidenceLabel = "Exact Match";
          } else if (input.normalized.includes(known)) {
            confidenceScore = 85;
            confidenceLabel = "User Contains Discogs";
          } else if (known.includes(input.normalized)) {
            confidenceScore = 75;
            confidenceLabel = "Discogs Contains User";
          }

          return {
            side: input.side,
            runout_raw: input.raw,
            normalized_runout: input.normalized,
            discogs_release_id: String(identifier.discogs_release_id),
            identifier_value: identifier.identifier_value,
            identifier_description: identifier.identifier_description,
            confidence_score: confidenceScore,
            confidence_label: confidenceLabel,
          };
        })
      )
      .filter((match) => match.confidence_score > 0);

    const grouped = new Map<string, any>();

    for (const match of rawMatches) {
      const existing = grouped.get(match.discogs_release_id) ?? {
        discogs_release_id: match.discogs_release_id,
        matched_sides: new Set<string>(),
        best_score: 0,
        total_score: 0,
        evidence: [],
      };

      existing.matched_sides.add(match.side);
      existing.best_score = Math.max(existing.best_score, match.confidence_score);
      existing.total_score += match.confidence_score;
      existing.evidence.push(match);

      grouped.set(match.discogs_release_id, existing);
    }

    const releaseIds = Array.from(grouped.keys());

    const { data: records } = releaseIds.length
      ? await supabase
          .from("records_clean_safe")
          .select("artist,title,country,year,year_released,discogs_release_id,discogs_image_url,cover_url,discogs_url")
          .in("discogs_release_id", releaseIds)
      : { data: [] };

    const recordMap = new Map<string, any>();

    for (const record of records ?? []) {
      const key = String(record.discogs_release_id);
      if (!recordMap.has(key)) recordMap.set(key, record);
    }

    const matches = Array.from(grouped.values())
      .map((group) => {
        const matchedSideCount = group.matched_sides.size;
        const averageScore = group.total_score / group.evidence.length;
        const multiSideBonus = matchedSideCount >= 2 ? 12 : 0;
        const finalScore = Math.min(
          100,
          Math.round(averageScore * 0.65 + group.best_score * 0.35 + multiSideBonus)
        );

        const record = recordMap.get(group.discogs_release_id);

        return {
          discogs_release_id: group.discogs_release_id,
          confidence_score: finalScore,
          confidence_tier: confidenceTier(finalScore),
          matched_sides: Array.from(group.matched_sides),
          evidence: group.evidence.sort(
            (a: any, b: any) => b.confidence_score - a.confidence_score
          ),
          artist: record?.artist ?? "Unknown Artist",
          title: record?.title ?? "Unknown Title",
          country: record?.country ?? "Unknown",
          year: record?.year ?? record?.year_released ?? null,
          image_url: record?.discogs_image_url ?? record?.cover_url ?? null,
          discogs_url:
            record?.discogs_url ??
            `https://www.discogs.com/release/${group.discogs_release_id}`,
        };
      })
      .sort((a, b) => b.confidence_score - a.confidence_score)
      .slice(0, 12);

    return NextResponse.json({
      ok: true,
      message: `Found ${matches.length} candidate release match(es).`,
      matches,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Unknown identify error.",
        matches: [],
      },
      { status: 500 }
    );
  }
}
