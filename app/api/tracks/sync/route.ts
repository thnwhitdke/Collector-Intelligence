import { NextResponse } from "next/server";
import {
  syncTracksForCollection,
  syncTracksForRelease,
} from "@/app/actions/track-sync";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    if (
      Array.isArray(body?.releaseIds) &&
      body.releaseIds.length > 0
    ) {
      const results = [];

      for (const releaseId of body.releaseIds) {
        const result = await syncTracksForRelease(
          String(releaseId)
        );
        results.push(result);
      }

      return NextResponse.json({
        ok: true,
        processed: results.length,
        inserted: results.reduce(
          (sum, result) =>
            sum + (result.inserted ?? 0),
          0
        ),
        results,
      });
    }

    if (body?.releaseId) {
      const result = await syncTracksForRelease(
        String(body.releaseId)
      );

      return NextResponse.json(result);
    }

    const limit = Number(body?.limit ?? 25);

    const result = await syncTracksForCollection(limit);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Unknown track sync error.",
      },
      { status: 500 }
    );
  }
}
