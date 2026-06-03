import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, places = 2): number {
  return Number(value.toFixed(places));
}

function percentDelta(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return round(((current - previous) / previous) * 100, 2);
}

function moneyText(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
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
      rawTopMovers,
      topIq,
      snapshots,
      latestSalesSummaries,
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

      supabase
        .from("portfolio_intelligence_snapshots")
        .select(`
          id,
          created_at,
          user_id,
          total_records,
          total_collection_value,
          average_record_value,
          average_collector_iq,
          high_value_records,
          elite_value_records,
          accelerating_records,
          volatile_records,
          high_demand_records,
          intelligence_confidence_score,
          intelligence_confidence_label
        `)
        .gte("total_records", 100)
        .order("created_at", { ascending: true }),

      supabase
        .from("sales_intelligence_summary")
        .select("record_id, median_sale_price, average_sale_price, matched_sales_count, confidence_score, confidence_label, updated_at")
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

    const moverRecordIds = (rawTopMovers.data ?? [])
      .map((m) => m.record_id)
      .filter(Boolean);

    const salesRecordIds = (latestSalesSummaries.data ?? [])
      .map((s) => s.record_id)
      .filter(Boolean);

    const relatedRecordIds = Array.from(
      new Set([...moverRecordIds, ...salesRecordIds])
    );

    const { data: relatedRecords } = await supabase
      .from("records_clean_safe")
      .select("id, artist, title, estimated_value")
      .in("id", relatedRecordIds);

    const recordMap = new Map(
      (relatedRecords ?? []).map((record) => [Number(record.id), record])
    );

    const topMovers = (rawTopMovers.data ?? []).map((mover) => ({
      ...mover,
      record: recordMap.get(Number(mover.record_id)) ?? null,
    }));

    const iqValues = (iqRows.data ?? [])
      .map((row) => toNumber(row.collector_iq_score))
      .filter((value) => value > 0);

    const maxIq = iqValues.length > 0 ? Math.max(...iqValues) : 0;

    const averageIq =
      iqValues.length > 0
        ? round(iqValues.reduce((sum, value) => sum + value, 0) / iqValues.length)
        : 0;

    const snapshotRows = snapshots.data ?? [];
    const firstSnapshot = snapshotRows[0] ?? null;
    const previousSnapshot =
      snapshotRows.length >= 2 ? snapshotRows[snapshotRows.length - 2] : null;
    const latestSnapshot =
      snapshotRows.length >= 1 ? snapshotRows[snapshotRows.length - 1] : null;

    const previousValue = toNumber(previousSnapshot?.total_collection_value);
    const latestValue = toNumber(latestSnapshot?.total_collection_value);
    const firstValue = toNumber(firstSnapshot?.total_collection_value);

    const previousIq = toNumber(previousSnapshot?.average_collector_iq);
    const latestIq = toNumber(latestSnapshot?.average_collector_iq);

    const deltaFromPrevious = round(latestValue - previousValue);
    const percentFromPrevious = percentDelta(latestValue, previousValue);
    const deltaFromFirst = round(latestValue - firstValue);
    const percentFromFirst = percentDelta(latestValue, firstValue);
    const iqDeltaFromPrevious = round(latestIq - previousIq);

    const portfolioTrend =
      latestSnapshot && previousSnapshot
        ? {
            snapshotCount: snapshotRows.length,
            firstValue,
            previousValue,
            latestValue,
            deltaFromPrevious,
            percentFromPrevious,
            deltaFromFirst,
            percentFromFirst,
            previousIq,
            latestIq,
            iqDeltaFromPrevious,
            direction:
              deltaFromPrevious > 0
                ? "up"
                : deltaFromPrevious < 0
                  ? "down"
                  : "flat",
            health:
              percentFromPrevious > 1
                ? "Bullish"
                : percentFromPrevious < -1
                  ? "Bearish"
                  : "Stable",
            latestSnapshot,
          }
        : null;

    const intelligenceFeed = [];

    if (portfolioTrend) {
      intelligenceFeed.push({
        id: "portfolio-snapshot",
        type: "Portfolio",
        title: "Portfolio Snapshot Recorded",
        summary: `Portfolio value is ${moneyText(portfolioTrend.latestValue)}.`,
        detail: `${portfolioTrend.health} health • ${portfolioTrend.deltaFromPrevious >= 0 ? "+" : ""}${moneyText(Math.abs(portfolioTrend.deltaFromPrevious))} since previous snapshot • ${portfolioTrend.percentFromPrevious}%`,
        timestamp: portfolioTrend.latestSnapshot.created_at,
      });
    }

    if (topMovers[0]) {
      const mover = topMovers[0];
      intelligenceFeed.push({
        id: `market-${mover.record_id}`,
        type: "Market",
        title: "Strongest Market Signal",
        summary: `${mover.record?.artist ?? "Unknown Artist"} — ${mover.record?.title ?? "Unknown Record"}`,
        detail: `${mover.signal_label ?? "Unknown"} • ${mover.signal_strength ?? "—"} • Momentum ${mover.market_momentum ?? 0} • Supply ${mover.supply_delta_percent ?? 0}%`,
        timestamp: mover.calculated_at,
      });
    }

    if (topIq.data?.[0]) {
      const leader = topIq.data[0];
      intelligenceFeed.push({
        id: `iq-${leader.id}`,
        type: "Collector IQ",
        title: "Highest Collector IQ",
        summary: `${leader.artist ?? "Unknown Artist"} — ${leader.title ?? "Unknown Record"}`,
        detail: `Collector IQ ${leader.collector_iq_score ?? 0} • Estimated value ${moneyText(toNumber(leader.estimated_value))}`,
        timestamp: new Date().toISOString(),
      });
    }

    for (const sale of latestSalesSummaries.data ?? []) {
      const record = recordMap.get(Number(sale.record_id));
      intelligenceFeed.push({
        id: `sales-${sale.record_id}`,
        type: "Sales",
        title: "Sales Intelligence Summary",
        summary: `${record?.artist ?? "Unknown Artist"} — ${record?.title ?? "Unknown Record"}`,
        detail: `${sale.matched_sales_count ?? 0} matched sales • Median ${moneyText(toNumber(sale.median_sale_price))} • Confidence ${sale.confidence_score ?? 0}`,
        timestamp: sale.updated_at,
      });
    }

    intelligenceFeed.sort((a, b) => {
      const bTime = new Date(b.timestamp ?? 0).getTime();
      const aTime = new Date(a.timestamp ?? 0).getTime();
      return bTime - aTime;
    });

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
      portfolioTrend,
      intelligenceFeed,
      topMovers,
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
