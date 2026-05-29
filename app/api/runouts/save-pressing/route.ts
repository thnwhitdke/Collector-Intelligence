import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const recordId = Number(body?.recordId);
    const discogsReleaseId = String(body?.discogsReleaseId ?? "").trim();
    const confidenceScore = Number(body?.confidenceScore ?? 0);
    const confidenceTier = String(body?.confidenceTier ?? "Unknown");

    if (!Number.isFinite(recordId) || recordId <= 0) {
      return NextResponse.json({
        ok: false,
        message: "Missing valid record ID.",
      });
    }

    if (!discogsReleaseId) {
      return NextResponse.json({
        ok: false,
        message: "Missing Discogs release ID.",
      });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("record_pressing_matches")
      .upsert(
        {
          record_id: recordId,
          discogs_release_id: discogsReleaseId,
          confidence_score: confidenceScore,
          confidence_tier: confidenceTier,
          identified_from: "runout_engine",
          matched_at: new Date().toISOString(),
        },
        {
          onConflict: "record_id,discogs_release_id",
        }
      );

    if (error) {
      return NextResponse.json({
        ok: false,
        message: error.message,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Pressing match saved.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Unknown save pressing error.",
      },
      { status: 500 }
    );
  }
}
