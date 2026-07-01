import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

function sanitizeSearch(value: string) {
  return value.replace(/[%_,]/g, "").slice(0, 80);
}

export async function GET(request: NextRequest) {
  const userSupabase = await createClient();

  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = sanitizeSearch(request.nextUrl.searchParams.get("q")?.trim() ?? "");

  if (!q) {
    return NextResponse.json({
      ownedRecords: [],
      warehouseResults: [],
      wantListItems: [],
    });
  }

  const admin = createAdminClient();

  const [ownedRes, warehouseRes, wantRes] = await Promise.all([
    userSupabase
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
        discogs_release_id,
        estimated_value,
        market_consensus_value,
        collector_iq_score,
        cover_url,
        discogs_image_url,
        discogs_thumbnail_url
      `)
      .eq("user_id", user.id)
      .or(`artist.ilike.%${q}%,title.ilike.%${q}%,label.ilike.%${q}%,catalogue_number.ilike.%${q}%,discogs_release_id.ilike.%${q}%`)
      .limit(50),

    admin
      .from("warehouse_release_intelligence")
      .select(`
        warehouse_release_id,
        artist,
        title,
        label,
        country,
        released_year,
        warehouse_rarity_score,
        collector_grade,
        global_rank
      `)
      .or(`artist.ilike.%${q}%,title.ilike.%${q}%,label.ilike.%${q}%`)
      .order("warehouse_rarity_score", { ascending: false, nullsFirst: false })
      .limit(50),

    userSupabase
      .from("want_list")
      .select("*")
      .eq("user_id", user.id)
      .or(`artist.ilike.%${q}%,title.ilike.%${q}%,label.ilike.%${q}%`)
      .limit(50),
  ]);

  if (ownedRes.error) {
    return NextResponse.json({ error: ownedRes.error.message }, { status: 500 });
  }

  if (warehouseRes.error) {
    return NextResponse.json({ error: warehouseRes.error.message }, { status: 500 });
  }

  const ownedDiscogsIds = new Set(
    (ownedRes.data ?? [])
      .map((r: any) => String(r.discogs_release_id || "").trim())
      .filter(Boolean)
  );

  const wantDiscogsIds = new Set(
    (wantRes.data ?? [])
      .map((r: any) => String(r.discogs_release_id || "").trim())
      .filter(Boolean)
  );

  const warehouseResults = (warehouseRes.data ?? []).map((row: any) => {
    const releaseId = String(row.warehouse_release_id || "").trim();

    return {
      ...row,
      status: ownedDiscogsIds.has(releaseId)
        ? "in_collection"
        : wantDiscogsIds.has(releaseId)
          ? "in_want_list"
          : "warehouse",
      canAddToCollection: !ownedDiscogsIds.has(releaseId),
      canAddToWantList: !ownedDiscogsIds.has(releaseId) && !wantDiscogsIds.has(releaseId),
    };
  });

  return NextResponse.json({
    query: q,
    ownedRecords: ownedRes.data ?? [],
    wantListItems: wantRes.data ?? [],
    warehouseResults,
  });
}
