import { NextResponse } from "next/server";

import { processSalesPipeline } from "@/app/actions/process-sales-pipeline";

export async function GET() {
  try {
    const result = await processSalesPipeline(25);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: unknown) {
    console.error("SALES PIPELINE CRON ERROR:", err);

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
