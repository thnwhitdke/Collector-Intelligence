import { NextResponse } from "next/server";
import { updateLastSeenOps } from "@/app/services/activity/updateLastSeen";

export async function POST() {
  try {
    await updateLastSeenOps();

    return NextResponse.json({
      ok: true,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[ops-seen]", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
