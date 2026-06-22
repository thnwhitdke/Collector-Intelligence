import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  const { data: summary, error: summaryError } = await supabase
    .from("collection_master_intelligence_summary")
    .select("*")
    .order("summary_date", { ascending: false })
    .limit(1)
    .single();

  if (summaryError) {
    return NextResponse.json(
      {
        ok: false,
        error: summaryError.message,
      },
      {
        status: 500,
      }
    );
  }

  const { data: topMasters, error: topMastersError } = await supabase
    .from("collection_master_intelligence")
    .select(`
      master_artist,
      master_title,
      total_releases,
      total_countries,
      total_labels,
      release_span_years,
      master_rarity
    `)
    .order("total_releases", { ascending: false })
    .limit(10);

  if (topMastersError) {
    return NextResponse.json(
      {
        ok: false,
        error: topMastersError.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    ok: true,
    summary,
    topMasters: topMasters ?? [],
  });
}
