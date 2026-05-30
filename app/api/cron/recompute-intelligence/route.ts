import { NextResponse } from "next/server";
import { recomputeIntelligence } from "@/app/actions/recompute-intelligence";

export async function GET() {

  try {

    const result =
      await recomputeIntelligence(
        25
      );

    return NextResponse.json({
      job:
        "recompute-intelligence",
      timestamp:
        new Date().toISOString(),
      ...result,
    });

  } catch (err: any) {

    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ||
          "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}
