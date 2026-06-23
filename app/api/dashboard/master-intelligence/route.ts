import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

export async function GET() {
  const userSupabase = await createClient();

  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: summary, error: summaryError } = await supabase
    .from("collection_master_intelligence_summary")
    .select("*")
    .order("summary_date", { ascending: false })
    .limit(1)
    .single();

  if (summaryError) {
    return NextResponse.json({ ok: false, error: summaryError.message }, { status: 500 });
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
    return NextResponse.json({ ok: false, error: topMastersError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    userId: user.id,
    summary,
    topMasters: topMasters ?? [],
  });
}
