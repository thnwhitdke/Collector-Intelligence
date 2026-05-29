"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";
import { fetchDiscogsTracklist } from "@/src/lib/discogs";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDurationToSeconds(duration?: string | null) {
  if (!duration) return null;

  const match = duration.match(/^(\d+):(\d+)$/);
  if (!match) return null;

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);

  if (Number.isNaN(minutes) || Number.isNaN(seconds)) return null;

  return minutes * 60 + seconds;
}

function inferSide(position?: string | null) {
  if (!position) return null;
  const match = position.match(/^([A-Z])/i);
  return match ? match[1].toUpperCase() : null;
}

function inferTrackNumber(position?: string | null) {
  if (!position) return null;
  const match = position.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function dedupeTrackRows<
  T extends {
    discogs_release_id: string;
    position: string | null;
    title: string;
  }
>(rows: T[]) {
  const seen = new Set<string>();

  return rows.filter((row) => {
    const key = [
      row.discogs_release_id,
      row.position ?? "",
      row.title,
    ].join("||");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export async function syncTracksForRelease(releaseId: string) {
  if (!releaseId) {
    return {
      ok: false,
      releaseId,
      inserted: 0,
      message: "Missing Discogs release ID.",
    };
  }

  const supabase = createAdminClient();

  const tracklist = await fetchDiscogsTracklist(releaseId);

  if (tracklist.length === 0) {
    return {
      ok: true,
      releaseId,
      inserted: 0,
      message: "No tracks found.",
    };
  }

  const rawRows = tracklist.map((track) => ({
    discogs_release_id: releaseId,
    position: track.position ?? null,
    side: inferSide(track.position),
    track_number: inferTrackNumber(track.position),
    title: track.title ?? "Unknown Track",
    duration_raw: track.duration ?? null,
    duration_seconds: parseDurationToSeconds(track.duration),
    artist_credit:
      track.artists?.map((artist) => artist.name).join(", ") ?? null,
  }));

  const rows = dedupeTrackRows(rawRows);

  const { error } = await supabase
    .from("release_tracks")
    .upsert(rows, {
      onConflict: "discogs_release_id,position,title",
    });

  if (error) {
    return {
      ok: false,
      releaseId,
      inserted: 0,
      message: error.message,
    };
  }

  return {
    ok: true,
    releaseId,
    inserted: rows.length,
    message: `Synced ${rows.length} track(s).`,
  };
}

export async function syncTracksForCollection(limit = 25) {
  const supabase = createAdminClient();

  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 25);

  const { data: records, error: recordsError } = await supabase
    .from("records_clean_safe")
    .select("discogs_release_id")
    .not("discogs_release_id", "is", null)
    .limit(safeLimit * 8);

  if (recordsError) {
    return {
      ok: false,
      stoppedEarly: true,
      processed: 0,
      inserted: 0,
      results: [{ ok: false, inserted: 0, message: recordsError.message }],
    };
  }

  const candidateReleaseIds = Array.from(
    new Set(
      (records ?? [])
        .map((row) => row.discogs_release_id)
        .filter(Boolean)
        .map(String)
    )
  );

  const { data: existingTracks, error: existingError } = await supabase
    .from("release_tracks")
    .select("discogs_release_id")
    .in("discogs_release_id", candidateReleaseIds);

  if (existingError) {
    return {
      ok: false,
      stoppedEarly: true,
      processed: 0,
      inserted: 0,
      results: [{ ok: false, inserted: 0, message: existingError.message }],
    };
  }

  const alreadySynced = new Set(
    (existingTracks ?? []).map((row) => String(row.discogs_release_id))
  );

  const releaseIdsToSync = candidateReleaseIds
    .filter((releaseId) => !alreadySynced.has(releaseId))
    .slice(0, safeLimit);

  const results = [];
  let stoppedEarly = false;

  for (const releaseId of releaseIdsToSync) {
    try {
      const result = await syncTracksForRelease(releaseId);
      results.push(result);

      if (
        result.message.toLowerCase().includes("rate limit") ||
        result.message.includes("429")
      ) {
        stoppedEarly = true;
        break;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown track sync error.";

      results.push({
        ok: false,
        releaseId,
        inserted: 0,
        message,
      });

      if (
        message.toLowerCase().includes("rate limit") ||
        message.includes("429")
      ) {
        stoppedEarly = true;
        break;
      }
    }

    await sleep(900);
  }

  return {
    ok: !stoppedEarly,
    stoppedEarly,
    processed: results.length,
    inserted: results.reduce((sum, result) => sum + (result.inserted ?? 0), 0),
    remainingCandidates: Math.max(candidateReleaseIds.length - alreadySynced.size - results.length, 0),
    results,
  };
}
