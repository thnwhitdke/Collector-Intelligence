import { NextResponse } from "next/server";

export async function GET() {

  console.log("");
  console.log("========== ENRICH START ==========");

  try {

    console.log("Testing enrichment route");

    return NextResponse.json({
      success: true,
      enriched: 0,
      message: "Enrichment route operational",
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json({
      success: false,
      error: "Route failed",
    });
  }
}