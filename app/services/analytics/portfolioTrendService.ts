import { createClient } from "@/src/lib/supabase/server";

export type PortfolioTrend = {
  firstValue: number;
  previousValue: number;
  latestValue: number;
  deltaFromPrevious: number;
  percentFromPrevious: number;
  deltaFromFirst: number;
  percentFromFirst: number;
  firstIq: number;
  previousIq: number;
  latestIq: number;
  iqDeltaFromPrevious: number;
  direction: "up" | "down" | "flat";
  health: "Bullish" | "Stable" | "Bearish";
  snapshotCount: number;
};

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

export async function getPortfolioTrend(): Promise<PortfolioTrend | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("portfolio_intelligence_snapshots")
    .select(`
      created_at,
      total_records,
      total_collection_value,
      average_collector_iq
    `)
    .eq("user_id", user.id)
    .gte("total_records", 100)
    .order("created_at", { ascending: true });

  if (error) throw error;

  if (!data || data.length < 2) {
    return null;
  }

  const first = data[0];
  const previous = data[data.length - 2];
  const latest = data[data.length - 1];

  const firstValue = toNumber(first.total_collection_value);
  const previousValue = toNumber(previous.total_collection_value);
  const latestValue = toNumber(latest.total_collection_value);

  const firstIq = toNumber(first.average_collector_iq);
  const previousIq = toNumber(previous.average_collector_iq);
  const latestIq = toNumber(latest.average_collector_iq);

  const deltaFromPrevious = round(latestValue - previousValue);
  const percentFromPrevious = percentDelta(latestValue, previousValue);

  const deltaFromFirst = round(latestValue - firstValue);
  const percentFromFirst = percentDelta(latestValue, firstValue);

  const iqDeltaFromPrevious = round(latestIq - previousIq);

  const direction =
    deltaFromPrevious > 0 ? "up" : deltaFromPrevious < 0 ? "down" : "flat";

  const health =
    percentFromPrevious > 1
      ? "Bullish"
      : percentFromPrevious < -1
        ? "Bearish"
        : "Stable";

  return {
    firstValue,
    previousValue,
    latestValue,
    deltaFromPrevious,
    percentFromPrevious,
    deltaFromFirst,
    percentFromFirst,
    firstIq,
    previousIq,
    latestIq,
    iqDeltaFromPrevious,
    direction,
    health,
    snapshotCount: data.length,
  };
}
