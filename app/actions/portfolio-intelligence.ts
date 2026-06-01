"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";

type PortfolioSnapshotResult = {
  ok: boolean;
  userId: string;
  totalRecords: number;
  snapshotId?: number;
  error?: string;
};

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value: unknown, fallback = "Unknown"): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function distribution(
  records: any[],
  key: string,
  limit?: number
): Array<{ label: string; count: number }> {
  const map = new Map<string, number>();

  for (const record of records) {
    const label = normalizeText(record[key]);
    map.set(label, (map.get(label) ?? 0) + 1);
  }

  const rows = Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

function recordValue(record: any): number {
  return (
    toNumber(record.estimated_value) ||
    toNumber(record.current_value) ||
    toNumber(record.market_median_price) ||
    toNumber(record.discogs_median_price)
  );
}

export async function recomputePortfolioIntelligenceSnapshot(
  userId: string,
  snapshotReason = "manual_recompute"
): Promise<PortfolioSnapshotResult> {
  if (!userId) {
    return {
      ok: false,
      userId,
      totalRecords: 0,
      error: "Missing userId",
    };
  }

  const supabase = createAdminClient();

  const { data: records, error } = await supabase
    .from("records_clean_safe")
    .select(`
      id,
      artist,
      title,
      country,
      genre,
      estimated_value,
      current_value,
      market_median_price,
      discogs_median_price,
      collector_iq_score,
      demand_score,
      supply_pressure,
      volatility_score,
      rarity_score,
      market_momentum
    `)
    .eq("user_id", userId);

  if (error) {
    return {
      ok: false,
      userId,
      totalRecords: 0,
      error: error.message,
    };
  }

  const safeRecords = records ?? [];
  const totalRecords = safeRecords.length;

  const totalCollectionValue = safeRecords.reduce(
    (sum, record) => sum + recordValue(record),
    0
  );

  const averageRecordValue =
    totalRecords > 0 ? totalCollectionValue / totalRecords : 0;

  const averageCollectorIq =
    totalRecords > 0
      ? safeRecords.reduce(
          (sum, record) => sum + toNumber(record.collector_iq_score),
          0
        ) / totalRecords
      : 0;

  const averageDemandScore =
    totalRecords > 0
      ? safeRecords.reduce(
          (sum, record) => sum + toNumber(record.demand_score),
          0
        ) / totalRecords
      : 0;

  const averageSupplyPressure =
    totalRecords > 0
      ? safeRecords.reduce(
          (sum, record) => sum + toNumber(record.supply_pressure),
          0
        ) / totalRecords
      : 0;

  const averageVolatilityScore =
    totalRecords > 0
      ? safeRecords.reduce(
          (sum, record) => sum + toNumber(record.volatility_score),
          0
        ) / totalRecords
      : 0;

  const averageRarityScore =
    totalRecords > 0
      ? safeRecords.reduce(
          (sum, record) => sum + toNumber(record.rarity_score),
          0
        ) / totalRecords
      : 0;

  const highValueRecords = safeRecords.filter(
    (record) => recordValue(record) > 500
  ).length;

  const eliteValueRecords = safeRecords.filter(
    (record) => recordValue(record) > 1000
  ).length;

  const acceleratingRecords = safeRecords.filter((record) =>
    String(record.market_momentum ?? "")
      .toLowerCase()
      .includes("acceler")
  ).length;

  const volatileRecords = safeRecords.filter(
    (record) => toNumber(record.volatility_score) >= 50
  ).length;

  const highDemandRecords = safeRecords.filter(
    (record) => toNumber(record.demand_score) >= 50
  ).length;

  const topRecords = [...safeRecords]
    .sort((a, b) => recordValue(b) - recordValue(a))
    .slice(0, 15)
    .map((record) => ({
      id: record.id,
      artist: record.artist,
      title: record.title,
      value: recordValue(record),
      collector_iq_score: toNumber(record.collector_iq_score),
      market_momentum: record.market_momentum ?? null,
    }));

  const { data: inserted, error: insertError } = await supabase
    .from("portfolio_intelligence_snapshots")
    .insert({
      user_id: userId,
      total_records: totalRecords,
      total_collection_value: totalCollectionValue,
      average_record_value: averageRecordValue,
      average_collector_iq: averageCollectorIq,
      high_value_records: highValueRecords,
      elite_value_records: eliteValueRecords,
      average_demand_score: averageDemandScore,
      average_supply_pressure: averageSupplyPressure,
      average_volatility_score: averageVolatilityScore,
      average_rarity_score: averageRarityScore,
      accelerating_records: acceleratingRecords,
      volatile_records: volatileRecords,
      high_demand_records: highDemandRecords,
      country_distribution: distribution(safeRecords, "country"),
      genre_distribution: distribution(safeRecords, "genre", 8),
      top_records: topRecords,
      snapshot_reason: snapshotReason,
    })
    .select("id")
    .single();

  if (insertError) {
    return {
      ok: false,
      userId,
      totalRecords,
      error: insertError.message,
    };
  }

  return {
    ok: true,
    userId,
    totalRecords,
    snapshotId: inserted?.id,
  };
}
