import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

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
      iqRows,
      over100Count,
      missingIqCount,
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

      supabase
        .from("records_clean_safe")
        .select("collector_iq_score")
        .not("collector_iq_score", "is", null)
        .limit(5000),

      supabase
        .from("records_clean_safe")
        .select("id", { count: "exact", head: true })
        .gt("collector_iq_score", 100),

      supabase
        .from("records_clean_safe")
        .select("id", { count: "exact", head: true })
        .is("collector_iq_score", null),

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

    const iqValues = (iqRows.data ?? [])
      .map((row) => toNumber(row.collector_iq_score))
      .filter((value) => value > 0);

    const maxIq =
      iqValues.length > 0 ? Math.max(...iqValues) : 0;

    const averageIq =
      iqValues.length > 0
        ? Number(
            (
              iqValues.reduce((sum, value) => sum + value, 0) /
              iqValues.length
            ).toFixed(2),
          )
        : 0;

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
        maxIq,
        averageIq,
        over100Count: over100Count.count ?? 0,
        missingIqCount: missingIqCount.count ?? 0,
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
