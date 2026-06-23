import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, places = 2): number {
  return Number(value.toFixed(places));
}

export async function GET() {
  const userSupabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await userSupabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  const supabase = createAdminClient();

  const { data: activityState } = await supabase
    .from("user_activity_state")
    .select("last_seen_ops_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const lastSeen =
    activityState?.last_seen_ops_at ??
    new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();

  const [
    marketSnapshots,
    trendSignals,
    salesSummaries,
    portfolioSnapshots,
    latestPortfolioSnapshots,
    topTrend,
  ] = await Promise.all([
    supabase
      .from("market_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gt("captured_at", lastSeen),

    supabase
      .from("market_trend_signals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gt("calculated_at", lastSeen),

    supabase
      .from("sales_intelligence_summary")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gt("updated_at", lastSeen),

    supabase
      .from("portfolio_intelligence_snapshots")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gt("created_at", lastSeen),

    supabase
      .from("portfolio_intelligence_snapshots")
      .select("created_at,total_collection_value,average_collector_iq")
      .eq("user_id", user.id)
      .gte("total_records", 100)
      .order("created_at", { ascending: false })
      .limit(2),

    supabase
      .from("market_trend_signals")
      .select("record_id,market_momentum,signal_label,signal_strength,supply_delta_percent,price_delta_percent,calculated_at")
      .eq("user_id", user.id)
      .gt("calculated_at", lastSeen)
      .order("market_momentum", { ascending: false })
      .limit(1),
  ]);

  const latest = latestPortfolioSnapshots.data?.[0] ?? null;
  const previous = latestPortfolioSnapshots.data?.[1] ?? null;

  const latestValue = toNumber(latest?.total_collection_value);
  const previousValue = toNumber(previous?.total_collection_value);
  const portfolioDelta = round(latestValue - previousValue);

  let topTrendRecord = null;

  if (topTrend.data?.[0]?.record_id) {
    const { data: record } = await supabase
      .from("records_clean_safe")
      .select("id,artist,title,estimated_value")
      .eq("id", topTrend.data[0].record_id)
      .eq("user_id", user.id)
      .maybeSingle();

    topTrendRecord = record ?? null;
  }

  return NextResponse.json({
    ok: true,
    userId: user.id,
    lastSeen,
    generatedAt: new Date().toISOString(),
    counts: {
      marketSnapshots: marketSnapshots.count ?? 0,
      trendSignals: trendSignals.count ?? 0,
      salesSummaries: salesSummaries.count ?? 0,
      portfolioSnapshots: portfolioSnapshots.count ?? 0,
    },
    portfolio: {
      latestValue,
      previousValue,
      delta: portfolioDelta,
      latestIq: toNumber(latest?.average_collector_iq),
      previousIq: toNumber(previous?.average_collector_iq),
    },
    topTrend:
      topTrend.data?.[0]
        ? {
            ...topTrend.data[0],
            record: topTrendRecord,
          }
        : null,
  });
}
