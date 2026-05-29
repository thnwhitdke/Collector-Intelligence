import { NextResponse } from "next/server";
import {
  syncRunoutsForCollection,
  syncRunoutsForDiscogsReleaseId,
  syncRunoutsForRecordId,
} from "@/app/actions/runout-sync";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    if (body?.releaseId) {
      const result = await syncRunoutsForDiscogsReleaseId(String(body.releaseId));
      return NextResponse.json(result);
    }

    if (body?.recordId) {
      const result = await syncRunoutsForRecordId(Number(body.recordId));
      return NextResponse.json(result);
    }

    const limit = Number(body?.limit ?? 25);
    const result = await syncRunoutsForCollection(limit);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Unknown runout sync error.",
      },
      { status: 500 }
    );
  }
}
