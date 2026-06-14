// ======================================================
// Collector Intelligence
// Value History Service
// Market Memory Engine
// ======================================================

import { createAdminClient } from "@/src/lib/supabase/admin";

type SnapshotAllValueHistoryResult = {
  ok: boolean;
  inserted: number;
  skipped: number;
  failed: number;
  totalRecords: number;
  error?: string;
};

function toNumber(value: unknown): number | null {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function consensusValue(record: any): number | null {
  return (
    toNumber(record.market_consensus_value) ||
    toNumber(record.estimated_value) ||
    toNumber(record.current_value) ||
    toNumber(record.market_median_price) ||
    toNumber(record.discogs_median_price)
  );
}

function startOfUtcDay(date = new Date()) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0
    )
  ).toISOString();
}

export async function snapshotValueHistory(recordId: number) {
  const supabase = createAdminClient();

  const { data: record, error } = await supabase
    .from("records_clean_safe")
    .select(`
      market_consensus_value,
      estimated_value,
      current_value,
      market_median_price,
      discogs_low_price,
      discogs_median_price,
      discogs_high_price,
      discogs_num_for_sale,
      value_source
    `)
    .eq("id", recordId)
    .single();

  if (error) {
    throw error;
  }

  const { error: insertError } = await supabase
    .from("value_history")
    .insert({
      record_id: recordId,
      estimated_value: consensusValue(record),
      discogs_low: record?.discogs_low_price,
      discogs_median: record?.discogs_median_price,
      discogs_high: record?.discogs_high_price,
      market_num_for_sale: record?.discogs_num_for_sale,
      value_source: record?.value_source || "consensus_snapshot",
    });

  if (insertError) {
    throw insertError;
  }
}

export async function snapshotAllValueHistory(
  userId?: string
): Promise<SnapshotAllValueHistoryResult> {
  const supabase = createAdminClient();
  const todayStart = startOfUtcDay();

  let query = supabase
    .from("records_clean_safe")
    .select(`
      id,
      user_id,
      market_consensus_value,
      estimated_value,
      current_value,
      market_median_price,
      discogs_low_price,
      discogs_median_price,
      discogs_high_price,
      discogs_num_for_sale,
      value_source
    `)
    .order("id", { ascending: true });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: records, error } = await query;

  if (error) {
    return {
      ok: false,
      inserted: 0,
      skipped: 0,
      failed: 0,
      totalRecords: 0,
      error: error.message,
    };
  }

  const safeRecords = records || [];
  const recordIds = safeRecords.map((record) => record.id);

  const existingToday = new Set<number>();

  for (let i = 0; i < recordIds.length; i += 500) {
    const batchIds = recordIds.slice(i, i + 500);

    const { data: existing, error: existingError } = await supabase
      .from("value_history")
      .select("record_id")
      .in("record_id", batchIds)
      .gte("snapshot_date", todayStart);

    if (existingError) {
      return {
        ok: false,
        inserted: 0,
        skipped: 0,
        failed: 0,
        totalRecords: safeRecords.length,
        error: existingError.message,
      };
    }

    for (const row of existing || []) {
      existingToday.add(Number(row.record_id));
    }
  }

  const rows = safeRecords
    .filter((record) => !existingToday.has(Number(record.id)))
    .map((record) => ({
      record_id: record.id,
      estimated_value: consensusValue(record),
      discogs_low: record.discogs_low_price,
      discogs_median: record.discogs_median_price,
      discogs_high: record.discogs_high_price,
      market_num_for_sale: record.discogs_num_for_sale,
      value_source: record.value_source || "daily_consensus_snapshot",
    }));

  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);

    const { error: insertError } = await supabase
      .from("value_history")
      .insert(batch);

    if (insertError) {
      failed += batch.length;
      console.error("[Value History Snapshot] Batch failed:", insertError);
    } else {
      inserted += batch.length;
    }
  }

  return {
    ok: failed === 0,
    inserted,
    skipped: existingToday.size,
    failed,
    totalRecords: safeRecords.length,
  };
}
