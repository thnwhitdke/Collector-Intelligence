import { NextResponse } from "next/server";

import { recomputeSalesIntelligenceSummary } from "@/app/actions/sales-summary";

export async function GET() {
  try {
    const result = await recomputeSalesIntelligenceSummary(500);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: unknown) {
    console.error("SALES SUMMARY CRON ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}
