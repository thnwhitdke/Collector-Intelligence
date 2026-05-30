import { NextResponse } from "next/server";
import { syncRunoutsForCollection } from "@/app/actions/runout-sync";

export async function GET() {
  try {
    const result = await syncRunoutsForCollection(25);

    return NextResponse.json({
      job: "runout-sync",
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}
