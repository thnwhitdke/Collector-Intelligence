import { NextResponse } from "next/server";

import { generateSearchProfile } from "@/app/actions/search-profiles";

export async function GET() {
  try {
    // CHANGE THIS TO A REAL RECORD ID
    const result = await generateSearchProfile(125);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}