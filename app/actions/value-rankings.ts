// app/actions/value-rankings.ts

"use server";

import { createClient } from "../../src/lib/supabase/server";

export type ValueRankingRecord = {
  id: string;
  artist: string | null;
  title: string | null;
  cover_url: string | null;
  estimated_value: number | null;
  purchase_price: number | null;
  value_last_updated: string | null;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
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
    purchase_price: toNumber(row.purchase_price),
    value_last_updated:
      typeof row.value_last_updated === "string" ? row.value_last_updated : null,
  };
}

export type ValueRankings = {
  topEstimated: ValueRankingRecord[];
  biggestGainers: ValueRankingRecord[];
  needsValuePull: ValueRankingRecord[];
};

export async function getValueRankings(): Promise<ValueRankings> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("records_clean_safe")
    .select(
      "id, artist, title, cover_url, estimated_value, purchase_price, value_last_updated",
    )
    .limit(1000);

  if (error || !data) {
    return {
      topEstimated: [],
      biggestGainers: [],
      needsValuePull: [],
    };
  }

  const records = data.map((row) => normalizeRecord(row));

  const topEstimated = [...records]
    .filter((record) => record.estimated_value !== null)
    .sort((a, b) => (b.estimated_value ?? 0) - (a.estimated_value ?? 0))
    .slice(0, 5);

  const biggestGainers = [...records]
    .filter(
      (record) =>
        record.estimated_value !== null && record.purchase_price !== null,
    )
    .sort((a, b) => {
      const gainA = (a.estimated_value ?? 0) - (a.purchase_price ?? 0);
      const gainB = (b.estimated_value ?? 0) - (b.purchase_price ?? 0);
      return gainB - gainA;
    })
    .slice(0, 5);

  const needsValuePull = [...records]
    .filter((record) => record.estimated_value === null)
    .slice(0, 5);

  return {
    topEstimated,
    biggestGainers,
    needsValuePull,
  };
}