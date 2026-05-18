import { NextResponse } from "next/server";

import { discoverComparableCandidates } from "../../actions/discover-comparables";

export async function GET() {
  try {
    const result = await discoverComparableCandidates(125);

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