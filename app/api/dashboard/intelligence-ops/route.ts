import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  try {
    const [
      recordsCount,
      marketHistoryCount,
      marketTrendCount,
      salesSummaryCount,
      normalizedSalesCount,
      releaseTracksCount,
      artistsCount,
      stylesCount,
      genresCount,
      iqHealth,
      topMovers,
      topIq,
    ] = await Promise.all([
      supabase.from("records_clean_safe").select("id", { count: "exact", head: true }),
      supabase.from("market_history").select("id", { count: "exact", head: true }),
      supabase.from("market_trend_signals").select("id", { count: "exact", head: true }),
      supabase.from("sales_intelligence_summary").select("id", { count: "exact", head: true }),
      supabase.from("normalized_sales_comps").select("id", { count: "exact", head: true }),
      supabase.from("release_tracks").select("id", { count: "exact", head: true }),
      supabase.from("artists").select("id", { count: "exact", head: true }),
      supabase.from("styles").select("id", { count: "exact", head: true }),
      supabase.from("genres").select("id", { count: "exact", head: true }),

      supabase.rpc("exec_sql", {
        sql: `
          select
            max(collector_iq_score) as max_iq,
            round(avg(collector_iq_score)::numeric, 2) as average_iq,
            count(*) filter (where collector_iq_score > 100) as over_100_count,
            count(*) filter (where collector_iq_score is null) as missing_iq_count
          from public.records_clean_safe;
        `,
      }),

      supabase
        .from("market_trend_signals")
        .select("record_id, market_momentum, signal_label, signal_strength, price_delta_percent, supply_delta_percent, calculated_at")
        .order("market_momentum", { ascending: false })
        .limit(10),

      supabase
        .from("records_clean_safe")
        .select("id, artist, title, estimated_value, collector_iq_score, rarity_score, market_momentum")
        .not("collector_iq_score", "is", null)
        .order("collector_iq_score", { ascending: false })
        .limit(10),
    ]);

    const iq = Array.isArray(iqHealth.data) ? iqHealth.data[0] : null;

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      counts: {
        records: recordsCount.count ?? 0,
        marketHistory: marketHistoryCount.count ?? 0,
        marketTrends: marketTrendCount.count ?? 0,
        salesSummaries: salesSummaryCount.count ?? 0,
        normalizedSales: normalizedSalesCount.count ?? 0,
        releaseTracks: releaseTracksCount.count ?? 0,
        artists: artistsCount.count ?? 0,
        styles: stylesCount.count ?? 0,
        genres: genresCount.count ?? 0,
      },
      iqHealth: {
        maxIq: Number(iq?.max_iq ?? 0),
        averageIq: Number(iq?.average_iq ?? 0),
        over100Count: Number(iq?.over_100_count ?? 0),
        missingIqCount: Number(iq?.missing_iq_count ?? 0),
      },
      topMovers: topMovers.data ?? [],
      topIq: topIq.data ?? [],
    });
  } catch (error) {
    console.error("[Intelligence Ops API]", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
