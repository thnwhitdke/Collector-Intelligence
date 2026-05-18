import { processEnrichmentQueue } from "@/app/actions/process-enrichment";

import { queueMissingMetadataRecords } from "@/app/actions/enrichment";

export async function GET() {

  try {

    console.log(
      "🔍 Scanning for incomplete records..."
    );

    const queueResult =
      await queueMissingMetadataRecords(
        25
      );

    console.log(
      "🧠 Queue population result:",
      queueResult
    );

    console.log(
      "🚀 Starting enrichment queue processing..."
    );

    const result =
      await processEnrichmentQueue(25);

    console.log(
      "✅ Enrichment processing complete:",
      result
    );

    return Response.json({
      success: true,
      queueResult,
      result,
      timestamp:
        new Date().toISOString(),
    });

  } catch (error: any) {

    console.error(
      "❌ Cron enrichment error:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          error.message ||
          "Unknown error",
      },
      {
        status: 500,
      }
    );

  }

}