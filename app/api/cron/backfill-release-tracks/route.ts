import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

const DISCOGS_API = "https://api.discogs.com";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDiscogsHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "User-Agent": process.env.DISCOGS_USER_AGENT || "CollectorIntelligence/1.0",
    Accept: "application/json",
  };

  if (process.env.DISCOGS_TOKEN) {
    headers.Authorization = `Discogs token=${process.env.DISCOGS_TOKEN}`;
  }

  return headers;
}

function durationToSeconds(value: unknown) {
  if (typeof value !== "string") return null;

  const parts = value.split(":").map((p) => Number(p));

  if (parts.some((p) => !Number.isFinite(p))) return null;

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return null;
}

function parseSide(position: unknown) {
  const text = String(position || "").trim();
  const match = text.match(/^([A-Z]+)/i);
  return match ? match[1].toUpperCase() : null;
}

function parseTrackNumber(position: unknown, fallback: number) {
  const text = String(position || "").trim();
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : fallback;
}

async function fetchDiscogsTracks(releaseId: string) {
  const response = await fetch(`${DISCOGS_API}/releases/${releaseId}`, {
    headers: getDiscogsHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      tracks: [],
    };
  }

  const json = await response.json();
  const tracklist = Array.isArray(json.tracklist) ? json.tracklist : [];

  const tracks = tracklist
    .filter((track: any) => track && typeof track === "object")
    .filter((track: any) => track.title)
    .map((track: any, index: number) => ({
      discogs_release_id: releaseId,
      position: track.position || String(index + 1),
      side: parseSide(track.position),
      track_number: parseTrackNumber(track.position, index + 1),
      title: String(track.title),
      duration_raw: track.duration || null,
      duration_seconds: durationToSeconds(track.duration),
      artist_credit: Array.isArray(track.artists)
        ? track.artists
            .map((artist: any) => artist?.name)
            .filter(Boolean)
            .join(", ")
        : null,
    }));

  return {
    ok: true,
    status: response.status,
    tracks,
  };
}

export async function GET() {
  const supabase = createAdminClient();

  const { data: trackRows } = await supabase
    .from("release_track_coverage_ids")
    .select("discogs_release_id")
    .limit(10000);

  const existingTrackIds = new Set(
    (trackRows || []).map((row) => String(row.discogs_release_id)),
  );

  const { data: records, error } = await supabase
    .from("records_clean_safe")
    .select("discogs_release_id")
    .not("discogs_release_id", "is", null)
    .limit(5000);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        job: "backfill-release-tracks",
        error: error.message,
      },
      { status: 500 },
    );
  }

  const missingReleaseIds = Array.from(
    new Set(
      (records || [])
        .map((record) => String(record.discogs_release_id || "").trim())
        .filter(Boolean)
        .filter((releaseId) => !existingTrackIds.has(releaseId)),
    ),
  ).slice(0, 15);

  let checked = 0;
  let inserted = 0;
  let skipped = 0;
  let stoppedEarly = false;

  const results = [];

  for (const releaseId of missingReleaseIds) {
    checked++;

    const result = await fetchDiscogsTracks(releaseId);

    if (!result.ok) {
      skipped++;

      results.push({
        releaseId,
        ok: false,
        status: result.status,
      });

      if (result.status === 429) {
        stoppedEarly = true;
        break;
      }

      await sleep(1000);
      continue;
    }

    if (!result.tracks.length) {
      skipped++;

      results.push({
        releaseId,
        ok: true,
        inserted: 0,
        reason: "no-tracklist",
      });

      await sleep(1000);
      continue;
    }

    const { error: insertError } = await supabase
      .from("release_tracks")
      .upsert(result.tracks, {
        onConflict: "discogs_release_id,position,title",
        ignoreDuplicates: true,
      });

    if (insertError) {
      skipped++;

      results.push({
        releaseId,
        ok: false,
        error: insertError.message,
      });

      await sleep(1000);
      continue;
    }

    inserted += result.tracks.length; // attempted inserts; duplicates ignored by upsert

    results.push({
      releaseId,
      ok: true,
      inserted: result.tracks.length,
    });

    await sleep(1000);
  }

  return NextResponse.json({
    ok: true,
    job: "backfill-release-tracks",
    timestamp: new Date().toISOString(),
    checked,
    inserted,
    skipped,
    stoppedEarly,
    results,
  });
}
