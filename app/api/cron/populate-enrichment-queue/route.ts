import { queueMissingMetadataRecords }
  from "@/app/actions/enrichment";

export async function GET() {

  try {

    console.log(
      "🔍 Scanning for incomplete records..."
    );

    const result =
      await queueMissingMetadataRecords(25);

    return Response.json({
      success: true,
      timestamp:
        new Date().toISOString(),
      ...result,
    });

  } catch (error: any) {

    console.error(
      "❌ Queue population error:",
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