import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.argv[2] || null;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

function toNumber(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function consensusValue(record) {
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
  console.error(error.message);
  process.exit(1);
}

const safeRecords = records || [];
const todayStart = startOfUtcDay();
const recordIds = safeRecords.map((record) => record.id);
const existingToday = new Set();

for (let i = 0; i < recordIds.length; i += 500) {
  const batchIds = recordIds.slice(i, i + 500);

  const { data: existing, error: existingError } = await supabase
    .from("value_history")
    .select("record_id")
    .in("record_id", batchIds)
    .gte("snapshot_date", todayStart);

  if (existingError) {
    console.error(existingError.message);
    process.exit(1);
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
    value_source: record.value_source || "terminal_daily_consensus_snapshot",
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
    console.error("[Value History Snapshot] Batch failed:", insertError.message);
  } else {
    inserted += batch.length;
  }
}

console.log(
  JSON.stringify(
    {
      ok: failed === 0,
      userId,
      totalRecords: safeRecords.length,
      inserted,
      skipped: existingToday.size,
      failed,
    },
    null,
    2
  )
);
