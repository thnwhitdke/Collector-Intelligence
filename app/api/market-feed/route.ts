import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("records_clean_safe")
    .select(`
      id,
      artist,
      title,
      discogs_low_price,
      discogs_median_price,
      discogs_high_price,
      value_last_updated
    `)
    .not("discogs_median_price", "is", null)
    .order(
      "value_last_updated",
      { ascending: false }
    )
    .limit(100);

  if (error) {
    console.error(
      "MARKET FEED ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    records: data || [],
  });
}
