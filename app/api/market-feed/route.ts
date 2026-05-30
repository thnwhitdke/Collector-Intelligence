import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

function toNumber(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(/[$,]/g, ""));

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

type FeedItem = {
  id: string;
  recordId: number;
  artist: string;
  title: string;
  rarity: number;
  value: number;
  status: "LIVE" | "ALERT" | "TRENDING";
  color: "blue" | "green" | "orange" | "red";
  signalType:
    | "thin_market"
    | "volatility"
    | "value_leader"
    | "hot_market"
    | "buy_watch"
    | "risk_watch"
    | "iq_leader"
    | "live_signal";
  message: string;
  change: number;
  score: number;
  timestamp: string | null;
};

function pushSignal(items: FeedItem[], item: FeedItem) {
  items.push(item);
}

export async function GET() {
  const supabase = createAdminClient();

  const { data: historyRows, error } = await supabase
    .from("market_history")
    .select(`
      id,
      record_id,
      discogs_low_price,
      discogs_median_price,
      discogs_high_price,
      discogs_for_sale,
      market_signal,
      captured_at
    `)
    .order("captured_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = Array.from(
    new Set(
      (historyRows ?? [])
        .map((r) => Number(r.record_id))
        .filter((id) => Number.isFinite(id)),
    ),
  );

  const { data: records } = ids.length
    ? await supabase
        .from("records_clean_safe")
        .select(`
          id,
          artist,
          title,
          rarity_score,
          rarity_index,
          estimated_value,
          collector_iq_score,
          demand_score,
          supply_pressure,
          volatility_score,
          market_momentum
        `)
        .in("id", ids)
    : { data: [] };

  const recordMap = new Map((records ?? []).map((r) => [String(r.id), r]));
  const now = Date.now();

  const candidates: FeedItem[] = [];

  for (const row of historyRows ?? []) {
    const record = recordMap.get(String(row.record_id));

    const recordId = Number(row.record_id);
    const artist = record?.artist ?? "Unknown Artist";
    const title = record?.title ?? `Record ${row.record_id}`;

    const rarity = toNumber(record?.rarity_index ?? record?.rarity_score);
    const value = toNumber(record?.estimated_value);
    const iq = toNumber(record?.collector_iq_score);
    const demand = toNumber(record?.demand_score);
    const supply = toNumber(record?.supply_pressure);
    const volatility = toNumber(record?.volatility_score);
    const momentum = String(record?.market_momentum ?? "");

    const low = toNumber(row.discogs_low_price);
    const median = toNumber(row.discogs_median_price);
    const high = toNumber(row.discogs_high_price);
    const forSale = toNumber(row.discogs_for_sale);

    const ageHours =
      (now - new Date(row.captured_at).getTime()) / 1000 / 60 / 60;

    const freshness = Math.max(0, 24 - ageHours);
    const spreadPercent =
      high > median && median > 0
        ? Math.round(((high - median) / median) * 100)
        : 0;

    if (forSale <= 2) {
      pushSignal(candidates, {
        id: `thin-${row.id}`,
        recordId,
        artist,
        title,
        rarity,
        value,
        status: "ALERT",
        color: "orange",
        signalType: "thin_market",
        message: `Thin market: ${forSale} listed · Spread $${median} → $${high}`,
        change: spreadPercent,
        score: 75 + rarity * 0.25 + freshness,
        timestamp: row.captured_at,
      });
    }

    if (spreadPercent >= 25 || volatility >= 50) {
      pushSignal(candidates, {
        id: `volatility-${row.id}`,
        recordId,
        artist,
        title,
        rarity,
        value,
        status: "ALERT",
        color: "red",
        signalType: "volatility",
        message: `Volatility alert: ${spreadPercent}% low-to-high spread`,
        change: spreadPercent,
        score: 70 + volatility * 0.4 + freshness,
        timestamp: row.captured_at,
      });
    }

    if (value >= 75) {
      pushSignal(candidates, {
        id: `value-${row.id}`,
        recordId,
        artist,
        title,
        rarity,
        value,
        status: "TRENDING",
        color: "green",
        signalType: "value_leader",
        message: `Value leader: estimated portfolio value $${value}`,
        change: 0,
        score: 60 + Math.min(value / 10, 40) + freshness,
        timestamp: row.captured_at,
      });
    }

    if (momentum.toLowerCase().includes("acceler")) {
      pushSignal(candidates, {
        id: `hot-${row.id}`,
        recordId,
        artist,
        title,
        rarity,
        value,
        status: "TRENDING",
        color: "green",
        signalType: "hot_market",
        message: `Hot market: accelerating collector momentum`,
        change: 0,
        score: 72 + demand * 0.3 + freshness,
        timestamp: row.captured_at,
      });
    }

    if (demand >= 50) {
      pushSignal(candidates, {
        id: `buy-${row.id}`,
        recordId,
        artist,
        title,
        rarity,
        value,
        status: "TRENDING",
        color: "green",
        signalType: "buy_watch",
        message: `Buy watch: demand score ${demand}`,
        change: demand,
        score: 68 + demand * 0.5 + freshness,
        timestamp: row.captured_at,
      });
    }

    if (volatility >= 50 || String(row.market_signal ?? "").toLowerCase().includes("bear")) {
      pushSignal(candidates, {
        id: `risk-${row.id}`,
        recordId,
        artist,
        title,
        rarity,
        value,
        status: "ALERT",
        color: "red",
        signalType: "risk_watch",
        message: `Risk watch: volatility score ${volatility}`,
        change: volatility,
        score: 66 + volatility * 0.5 + freshness,
        timestamp: row.captured_at,
      });
    }

    if (iq >= 100) {
      pushSignal(candidates, {
        id: `iq-${row.id}`,
        recordId,
        artist,
        title,
        rarity,
        value,
        status: "TRENDING",
        color: "blue",
        signalType: "iq_leader",
        message: `IQ leader: Collector IQ ${iq}`,
        change: iq,
        score: 65 + iq * 0.25 + freshness,
        timestamp: row.captured_at,
      });
    }

    if (candidates.length < 12) {
      pushSignal(candidates, {
        id: `live-${row.id}`,
        recordId,
        artist,
        title,
        rarity,
        value,
        status: "LIVE",
        color: "blue",
        signalType: "live_signal",
        message: row.market_signal || "Live market signal detected",
        change: 0,
        score: 40 + freshness,
        timestamp: row.captured_at,
      });
    }
  }

  const byRecordAndType = new Map<string, FeedItem>();

  for (const item of candidates.sort((a, b) => b.score - a.score)) {
    const key = `${item.recordId}-${item.signalType}`;
    if (!byRecordAndType.has(key)) {
      byRecordAndType.set(key, item);
    }
  }

  const uniqueByTitle = [];
  const titleSeen = new Set<string>();

  for (const item of Array.from(byRecordAndType.values())) {
    const key = `${normalize(item.artist)}-${normalize(item.title)}-${item.signalType}`;
    if (titleSeen.has(key)) continue;
    titleSeen.add(key);
    uniqueByTitle.push(item);
  }

  const buckets = [
    "hot_market",
    "buy_watch",
    "iq_leader",
    "value_leader",
    "thin_market",
    "volatility",
    "risk_watch",
    "live_signal",
  ];

  const balanced: FeedItem[] = [];

  for (const type of buckets) {
    balanced.push(
      ...uniqueByTitle
        .filter((item) => item.signalType === type)
        .slice(0, 5),
    );
  }

  return NextResponse.json({
    feed: balanced.slice(0, 40),
    source: "market_feed_v4_balanced",
  });
}
