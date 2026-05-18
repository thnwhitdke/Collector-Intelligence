import { NextResponse } from "next/server";

import { saveComparableSale } from "../../actions/comparables";

export async function GET() {
  try {
    const result = await saveComparableSale({
      record_id: 183, // CHANGE TO REAL RECORD ID

      source: "ebay",

      title: "Kevin Ayers - Example Comparable Sale",
      artist: "Kevin Ayers",

      sale_price: 34.99,
      shipping_price: 5.00,
      total_price: 39.99,

      currency: "USD",

      condition_media: "VG+",
      condition_sleeve: "VG",

      sold_date: new Date().toISOString(),

      listing_url: "https://example.com/listing",

      seller_name: "example_seller",
      seller_feedback_score: 1000,

      num_bids: 12,

      was_best_offer: false,

      pressing_notes: "UK Island Records CD",

      similarity_score: 0.92,
      confidence_score: 0.88,

      raw_payload: {
        source: "test-route",
      },
    });

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