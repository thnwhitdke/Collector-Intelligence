import { NextResponse } from "next/server";

import { syncMarketValues } from "@/app/actions/market-sync";

export async function GET() {
  try {
    console.log("Starting market sync...");

    const result = await syncMarketValues(25);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: unknown) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}