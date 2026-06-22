import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const search = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  let query = supabase
    .from("records_clean_safe")
    .select("id,artist,title,estimated_value,market_consensus_value")
    .limit(50);

  if (search.length > 0) {
    query = query.or(`artist.ilike.%${search}%,title.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    records: data ?? [],
  });
}
