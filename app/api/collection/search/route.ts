import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const search = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  let query = supabase
    .from("records_clean_safe")
    .select(`
      id,
      artist,
      title,
      label,
      catalogue_number,
      country,
      year,
      year_released,
      estimated_value,
      market_consensus_value,
      market_signal,
      market_trend,
      value_signal,
      collector_iq_score,
      confidence_score,
      cover_url,
      discogs_image_url,
      discogs_thumbnail_url
    `)
    .order("market_consensus_value", { ascending: false, nullsFirst: false })
    .limit(75);

  if (search.length > 0) {
    query = query.or(
      `artist.ilike.%${search}%,title.ilike.%${search}%,label.ilike.%${search}%,catalogue_number.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ records: data ?? [] });
}
