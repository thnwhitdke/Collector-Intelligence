import { NextResponse } from "next/server";

import {
  recomputeCIValueIntelligence,
} from "@/app/actions/value-intelligence";

export async function GET() {
  try {
    const result =
      await recomputeCIValueIntelligence();

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(
      "CI VALUE RECOMPUTE ERROR",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
