"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";

function clean(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function containsMatch(
  a: string,
  b: string
): boolean {
  if (!a || !b) return false;

  return (
    a.includes(b) ||
    b.includes(a)
  );
}

function confidenceLabel(score: number): string {
  if (score >= 85) return "High";
  if (score >= 65) return "Moderate";
  if (score >= 40) return "Developing";
  return "Low";
}

export async function matchSalesCompToRecords(
  normalizedSaleId: number
) {
  const supabase =
    createAdminClient();

  const { data: comp, error } =
    await supabase
      .from(
        "normalized_sales_comps"
      )
      .select("*")
      .eq(
        "id",
        normalizedSaleId
      )
      .single();

  if (error || !comp) {
    return {
      ok: false,
      error:
        error?.message ??
        "Normalized comp not found",
    };
  }

  const artist = clean(
    comp.normalized_artist
  );

  const title = clean(
    comp.normalized_title
  );

  const label = clean(
    comp.normalized_label
  );

  const {
    data: records,
    error: recordsError,
  } = await supabase
    .from(
      "records_clean_safe"
    )
    .select(
      "id,user_id,artist,title,label,year"
    );

  if (recordsError) {
    return {
      ok: false,
      error:
        recordsError.message,
    };
  }

  const results = [];

  for (
    const record of records ??
    []
  ) {
    let score = 0;
    const reasons = [];

    const recordArtist =
      clean(record.artist);

    const recordTitle =
      clean(record.title);

    const recordLabel =
      clean(record.label);

    if (
      containsMatch(
        artist,
        recordArtist
      )
    ) {
      score += 35;
      reasons.push(
        "Artist similarity"
      );
    }

    if (
      containsMatch(
        title,
        recordTitle
      )
    ) {
      score += 35;
      reasons.push(
        "Title similarity"
      );
    }

    if (
      label &&
      recordLabel &&
      containsMatch(
        label,
        recordLabel
      )
    ) {
      score += 10;
      reasons.push(
        "Label similarity"
      );
    }

    if (
      comp.normalized_year &&
      record.year &&
      Number(
        comp.normalized_year
      ) ===
        Number(
          record.year
        )
    ) {
      score += 20;
      reasons.push(
        "Year match"
      );
    }

    if (score >= 55) {
      const matchLabel =
        confidenceLabel(
          score
        );

      await supabase
        .from(
          "record_sales_matches"
        )
        .upsert(
          {
            record_id:
              record.id,
            user_id:
              record.user_id,
            normalized_sale_id:
              comp.id,
            match_score:
              score,
            match_confidence_label:
              matchLabel,
            match_reason:
              reasons.join(
                ", "
              ),
            matched_by:
              "matching_engine_v2",
          },
          {
            onConflict:
              "record_id,normalized_sale_id",
          }
        );

      results.push({
        recordId:
          record.id,
        score,
        label:
          matchLabel,
        reasons,
      });
    }
  }

  return {
    ok: true,
    matchesFound:
      results.length,
    results,
  };
}
