import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { syncTracksForRelease } from "@/app/actions/track-sync";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET() {
  const supabase = createAdminClient();

  try {
    const { data: records, error: recordsError } = await supabase
      .from("records_clean_safe")
      .select("discogs_release_id")
      .not("discogs_release_id", "is", null);

    if (recordsError) {
      throw recordsError;
    }

    const { data: tracks, error: tracksError } = await supabase
      .from("release_tracks")
      .select("discogs_release_id");

    if (tracksError) {
      throw tracksError;
    }

    const uniqueReleases = Array.from(
      new Set(
        (records ?? [])
          .map((row) => String(row.discogs_release_id))
          .filter(Boolean)
      )
    );

    const syncedReleases = new Set(
      (tracks ?? [])
        .map((row) => String(row.discogs_release_id))
        .filter(Boolean)
    );

    const unsynced = uniqueReleases.filter(
      (releaseId) => !syncedReleases.has(releaseId)
    );

    const batch = unsynced.slice(0, 10);

    const results = [];
    let stoppedEarly = false;

    for (const releaseId of batch) {
      try {
        const result = await syncTracksForRelease(releaseId);
        results.push(result);

        const text = JSON.stringify(result).toLowerCase();

        if (text.includes("rate limit") || text.includes("429")) {
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

        const text = message.toLowerCase();

        if (text.includes("rate limit") || text.includes("429")) {
          stoppedEarly = true;
          break;
        }
      }

      await sleep(900);
    }

    const inserted = results.reduce(
      (sum, result) => sum + (result.inserted ?? 0),
      0
    );

    return NextResponse.json({
      ok: !stoppedEarly,
      job: "track-sync",
      timestamp: new Date().toISOString(),
      totalReleases: uniqueReleases.length,
      syncedBeforeRun: syncedReleases.size,
      unsyncedBeforeRun: unsynced.length,
      processed: results.length,
      inserted,
      stoppedEarly,
      remainingAfterRun: Math.max(unsynced.length - results.length, 0),
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        job: "track-sync",
        timestamp: new Date().toISOString(),
        message:
          error instanceof Error
            ? error.message
            : "Unknown track sync cron error.",
      },
      { status: 500 }
    );
  }
}
