import { NextResponse } from "next/server";
import { processEnrichmentQueue } from "@/app/actions/process-enrichment";

export async function GET() {
  try {
    const result = await processEnrichmentQueue(25);

    return NextResponse.json({
      success: !result.error,
      job: "process-enrichment",
      timestamp: new Date().toISOString(),
      processed: result.processed,
      failed: result.failed,
      remaining: result.remaining ?? 0,
      error: result.error,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        job: "process-enrichment",
        timestamp: new Date().toISOString(),
        error:
          error instanceof Error
            ? error.message
            : "Unknown process-enrichment cron failure.",
      },
      {
        status: 500,
      }
    );
  }
}
