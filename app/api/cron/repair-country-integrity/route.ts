import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

const DISCOGS_API = "https://api.discogs.com";

function normalize(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^usa$/, "us")
    .replace(/^united states$/, "us")
    .replace(/^uk$/, "united kingdom");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchDiscogsCountry(releaseId: string) {
  const token = process.env.DISCOGS_TOKEN;
  const userAgent =
    process.env.DISCOGS_USER_AGENT || "CollectorIntelligence/1.0";

  if (!token) {
    return {
      ok: false,
      status: 0,
      country: null,
      error: "Missing DISCOGS_TOKEN",
    };
  }

  const response = await fetch(`${DISCOGS_API}/releases/${releaseId}`, {
    headers: {
      Authorization: `Discogs token=${token}`,
      "User-Agent": userAgent,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      country: null,
      error: `Discogs HTTP ${response.status}`,
    };
  }

  const json = await response.json();

  return {
    ok: true,
    status: response.status,
    country: json.country || null,
    error: null,
  };
}

export async function GET() {
  const supabase = createAdminClient();

  const limit = 25;

  const { data: records, error } = await supabase
    .from("records_clean_safe")
    .select("id, artist, title, country, discogs_release_id, enrichment_status")
    .not("discogs_release_id", "is", null)
    .neq("enrichment_status", "country_repaired")
    .order("id", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        job: "repair-country-integrity",
        error: error.message,
      },
      { status: 500 },
    );
  }

  let checked = 0;
  let updated = 0;
  let skipped = 0;
  let stoppedEarly = false;

  const results = [];

  for (const record of records || []) {
    checked++;

    const releaseId = String(record.discogs_release_id || "").trim();

    if (!releaseId) {
      skipped++;
      continue;
    }

    const result = await fetchDiscogsCountry(releaseId);

    if (!result.ok) {
      skipped++;

      results.push({
        id: record.id,
        ok: false,
        reason: result.error,
      });

      if (result.status === 429) {
        stoppedEarly = true;
        break;
      }

      continue;
    }

    if (!result.country) {
      skipped++;
      continue;
    }

    if (normalize(record.country) === normalize(result.country)) {
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from("records_clean_safe")
      .update({
        country: result.country,
        enrichment_status: "country_repaired",
        value_pull_note: `Country corrected from ${record.country || "Unknown"} to ${result.country} using Discogs release ${releaseId}.`,
        value_pull_last_attempted_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    if (updateError) {
      skipped++;

      results.push({
        id: record.id,
        ok: false,
        reason: updateError.message,
      });

      continue;
    }

    updated++;

    results.push({
      id: record.id,
      ok: true,
      from: record.country,
      to: result.country,
    });

    await sleep(900);
  }

  return NextResponse.json({
    ok: true,
    job: "repair-country-integrity",
    timestamp: new Date().toISOString(),
    checked,
    updated,
    skipped,
    stoppedEarly,
    remainingBatch: Math.max((records || []).length - checked, 0),
    results,
  });
}
