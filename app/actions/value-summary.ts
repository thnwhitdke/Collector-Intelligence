"use server";

import { createClient } from "../../src/lib/supabase/server";

export type ValueSummaryRecord = {
  id: string;
  artist: string | null;
  title: string | null;
  cover_url: string | null;
  estimated_value: number | null;
  purchase_price: number | null;
  discogs_low_price: number | null;
  discogs_median_price: number | null;
  discogs_high_price: number | null;
  value_source: string | null;
  value_last_updated: string | null;
  discogs_release_id: string | null;
  discogs_sale_blocked: boolean | null;
  discogs_sale_blocked_reason: string | null;
};

export type CollectionValueSummary = {
  totalRecords: number;
  recordsWithEstimatedValue: number;
  recordsWithPurchasePrice: number;
  recordsNeedingValuePull: number;
  blockedFromDiscogsSale: number;
  totalEstimatedValue: number;
  totalPurchaseCost: number;
  totalGainLoss: number;
  averageEstimatedValue: number;
  highestValueRecords: ValueSummaryRecord[];
  biggestGainers: ValueSummaryRecord[];
  needsValuePull: ValueSummaryRecord[];
  recentlyUpdated: ValueSummaryRecord[];
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeRecord(row: Record<string, unknown>): ValueSummaryRecord {
  return {
    id: String(row.id),
    artist: typeof row.artist === "string" ? row.artist : null,
    title: typeof row.title === "string" ? row.title : null,
    cover_url: typeof row.cover_url === "string" ? row.cover_url : null,
    estimated_value: toNumber(row.estimated_value),
    purchase_price: toNumber(row.purchase_price),
    discogs_low_price: toNumber(row.discogs_low_price),
    discogs_median_price: toNumber(row.discogs_median_price),
    discogs_high_price: toNumber(row.discogs_high_price),
    value_source: typeof row.value_source === "string" ? row.value_source : null,
    value_last_updated:
      typeof row.value_last_updated === "string" ? row.value_last_updated : null,
    discogs_release_id:
      row.discogs_release_id === null || row.discogs_release_id === undefined
        ? null
        : String(row.discogs_release_id),
    discogs_sale_blocked:
      typeof row.discogs_sale_blocked === "boolean"
        ? row.discogs_sale_blocked
        : null,
    discogs_sale_blocked_reason:
      typeof row.discogs_sale_blocked_reason === "string"
        ? row.discogs_sale_blocked_reason
        : null,
  };
}

function valueDelta(record: ValueSummaryRecord): number {
  return (record.estimated_value ?? 0) - (record.purchase_price ?? 0);
}

export async function getCollectionValueSummary(): Promise<CollectionValueSummary> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      totalRecords: 0,
      recordsWithEstimatedValue: 0,
      recordsWithPurchasePrice: 0,
      recordsNeedingValuePull: 0,
      blockedFromDiscogsSale: 0,
      totalEstimatedValue: 0,
      totalPurchaseCost: 0,
      totalGainLoss: 0,
      averageEstimatedValue: 0,
      highestValueRecords: [],
      biggestGainers: [],
      needsValuePull: [],
      recentlyUpdated: [],
    };
  }

  const { data, error } = await supabase
    .from("records_clean_safe")
    .select(
      [
        "id",
        "artist",
        "title",
        "cover_url",
        "estimated_value",
        "purchase_price",
        "discogs_low_price",
        "discogs_median_price",
        "discogs_high_price",
        "value_source",
        "value_last_updated",
        "discogs_release_id",
        "discogs_sale_blocked",
        "discogs_sale_blocked_reason",
      ].join(",")
    )
    .eq("user_id", user.id)
    .order("id", { ascending: false })
    .limit(5000);

  if (error) {
    console.error("getCollectionValueSummary error:", error);
    throw new Error("Unable to load value summary.");
  }

  const records = (data ?? []).map((row) =>
    normalizeRecord(row as unknown as Record<string, unknown>)
  );

  const recordsWithEstimatedValue = records.filter(
    (record) => record.estimated_value !== null
  );

  const recordsWithPurchasePrice = records.filter(
    (record) => record.purchase_price !== null
  );

  const totalEstimatedValue = records.reduce(
    (sum, record) => sum + (record.estimated_value ?? 0),
    0
  );

  const totalPurchaseCost = records.reduce(
    (sum, record) => sum + (record.purchase_price ?? 0),
    0
  );

  const needsValuePull = records
    .filter((record) => {
      const hasDiscogsId =
        record.discogs_release_id !== null && record.discogs_release_id.trim() !== "";
      const alreadyBlocked = record.discogs_sale_blocked === true;
      const missingValue = record.estimated_value === null;
      return hasDiscogsId && missingValue && !alreadyBlocked;
    })
    .slice(0, 12);

  const highestValueRecords = [...records]
    .filter((record) => record.estimated_value !== null)
    .sort((a, b) => (b.estimated_value ?? 0) - (a.estimated_value ?? 0))
    .slice(0, 8);

  const biggestGainers = [...records]
    .filter(
      (record) =>
        record.estimated_value !== null && record.purchase_price !== null
    )
    .sort((a, b) => valueDelta(b) - valueDelta(a))
    .slice(0, 8);

  const recentlyUpdated = [...records]
    .filter((record) => record.value_last_updated !== null)
    .sort((a, b) => {
      const left = a.value_last_updated
        ? new Date(a.value_last_updated).getTime()
        : 0;
      const right = b.value_last_updated
        ? new Date(b.value_last_updated).getTime()
        : 0;
      return right - left;
    })
    .slice(0, 8);

  return {
    totalRecords: records.length,
    recordsWithEstimatedValue: recordsWithEstimatedValue.length,
    recordsWithPurchasePrice: recordsWithPurchasePrice.length,
    recordsNeedingValuePull: needsValuePull.length,
    blockedFromDiscogsSale: records.filter(
      (record) => record.discogs_sale_blocked === true
    ).length,
    totalEstimatedValue,
    totalPurchaseCost,
    totalGainLoss: totalEstimatedValue - totalPurchaseCost,
    averageEstimatedValue:
      recordsWithEstimatedValue.length > 0
        ? totalEstimatedValue / recordsWithEstimatedValue.length
        : 0,
    highestValueRecords,
    biggestGainers,
    needsValuePull,
    recentlyUpdated,
  };
}
