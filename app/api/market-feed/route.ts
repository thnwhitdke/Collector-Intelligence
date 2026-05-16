import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  // STEP 1 — Get market history
  const { data: marketData, error: marketError } = await supabase
    .from("market_history")
    .select(`
      record_id,
      discogs_low_price,
      discogs_median_price,
      discogs_high_price,
      captured_at
    `)
    .not("discogs_median_price", "is", null)
    .order("captured_at", { ascending: false })
    .limit(50);

  if (marketError) {
    console.error("MARKET HISTORY ERROR:", marketError);

    return NextResponse.json(
      {
        error: marketError.message,
      },
      {
        status: 500,
      }
    );
  }

  // STEP 2 — Get all related IDs
  const ids = marketData.map((item) => Number(item.record_id));

  // STEP 3 — Query records_clean separately
  const { data: recordsData, error: recordsError } = await supabase
    .from("records_clean")
    .select(`
      id,
      artist,
      title
    `)
    .in("id", ids);

  if (recordsError) {
    console.error("RECORDS ERROR:", recordsError);

    return NextResponse.json(
      {
        error: recordsError.message,
      },
      {
        status: 500,
      }
    );
  }

  // STEP 4 — Create lookup map
  const recordsMap = new Map();

  recordsData.forEach((record) => {
    recordsMap.set(record.id, record);
  });

  // STEP 5 — Merge datasets
  const formatted = marketData.map((item) => {
    const record = recordsMap.get(Number(item.record_id));

    return {
      id: item.record_id,
      artist: record?.artist || "Unknown Artist",
      title: record?.title || "Unknown Album",
      discogs_low_price: item.discogs_low_price,
      discogs_median_price: item.discogs_median_price,
      discogs_high_price: item.discogs_high_price,
    };
  });

  return NextResponse.json({
    records: formatted,
  });
}