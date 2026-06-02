import { NextResponse } from "next/server";

import { recomputeMarketTrendSignals } from "@/app/actions/market-trends";

export async function GET() {
  try {
    const result = await recomputeMarketTrendSignals(500);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: unknown) {
    console.error("MARKET TRENDS CRON ERROR:", err);

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
