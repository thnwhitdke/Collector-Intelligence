// app/actions/value-rankings.ts

"use server";

import { createClient } from "../../src/lib/supabase/server";

export type ValueRankingRecord = {
  id: string;
  artist: string | null;
  title: string | null;
  cover_url: string | null;
  estimated_value: number | null;
  market_consensus_value: number | null;
  discogs_median_price: number | null;
  purchase_price: number | null;
  value_last_updated: string | null;
  discogs_sale_blocked: boolean | null;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeRecord(row: Record<string, unknown>): ValueRankingRecord {
  return {
    id: String(row.id),
    artist: typeof row.artist === "string" ? row.artist : null,
    title: typeof row.title === "string" ? row.title : null,
    cover_url: typeof row.cover_url === "string" ? row.cover_url : null,
    estimated_value: toNumber(row.estimated_value),
    market_consensus_value: toNumber(row.market_consensus_value),
    discogs_median_price: toNumber(row.discogs_median_price),
    purchase_price: toNumber(row.purchase_price),
    value_last_updated:
      typeof row.value_last_updated === "string" ? row.value_last_updated : null,
    discogs_sale_blocked:
      typeof row.discogs_sale_blocked === "boolean"
        ? row.discogs_sale_blocked
        : null,
  };
}

function consensusValue(record: ValueRankingRecord): number | null {
  if (record.market_consensus_value !== null && record.market_consensus_value > 0) {
    return record.market_consensus_value;
  }

  if (record.estimated_value !== null && record.estimated_value > 0) {
    return record.estimated_value;
  }

  if (record.discogs_median_price !== null && record.discogs_median_price > 0) {
    return record.discogs_median_price;
  }

  return null;
}

export type ValueRankings = {
  topEstimated: ValueRankingRecord[];
  biggestGainers: ValueRankingRecord[];
  needsValuePull: ValueRankingRecord[];
};

export async function getValueRankings(): Promise<ValueRankings> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      topEstimated: [],
      biggestGainers: [],
      needsValuePull: [],
    };
  }

  const { data, error } = await supabase
    .from("records_clean_safe")
    .select(
      "id, artist, title, cover_url, estimated_value, market_consensus_value, discogs_median_price, purchase_price, value_last_updated, discogs_sale_blocked",
    )
    .eq("user_id", user.id)
    .limit(500);

  if (error || !data) {
    return {
      topEstimated: [],
      biggestGainers: [],
      needsValuePull: [],
    };
  }

  const records = data.map((row) => normalizeRecord(row));

  const topEstimated = [...records]
    .filter((record) => consensusValue(record) !== null)
    .sort((a, b) => (consensusValue(b) ?? 0) - (consensusValue(a) ?? 0))
    .slice(0, 5);

  const biggestGainers = [...records]
    .filter(
      (record) =>
        consensusValue(record) !== null && record.purchase_price !== null,
    )
    .sort((a, b) => {
      const gainA = (consensusValue(a) ?? 0) - (a.purchase_price ?? 0);
      const gainB = (consensusValue(b) ?? 0) - (b.purchase_price ?? 0);
      return gainB - gainA;
    })
    .slice(0, 5);

  const needsValuePull = [...records]
    .filter((record) => {
      if (record.discogs_sale_blocked === true) return false;
      return consensusValue(record) === null;
    })
    .slice(0, 5);

  return {
    topEstimated,
    biggestGainers,
    needsValuePull,
  };
}
