import { NextResponse } from "next/server";

import { computeValuation } from "../../actions/valuation-engine";

export async function GET() {
  try {
    const result = await computeValuation(125);

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