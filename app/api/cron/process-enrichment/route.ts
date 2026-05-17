import { processEnrichmentQueue } from "@/app/actions/process-enrichment";
export async function GET() {
  try {
    console.log("🚀 Starting enrichment queue processing...");

    const result = await processEnrichmentQueue(25);

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      processed: result?.processed ?? 0,
      failed: result?.failed ?? 0,
      remaining: result?.remaining ?? 0,
      message: "Enrichment queue processed successfully",
    });
  } catch (error: any) {
    console.error("❌ Cron enrichment error:", error);

    return Response.json(
      {
        success: false,
        error: error.message || "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}