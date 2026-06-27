import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SOURCE_TABLE = "discogs_master_reference";
const TARGET_TABLE = "warehouse_release_intelligence";
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 5000);
const MAX_BATCHES = Number(process.env.MAX_BATCHES || 100);

function clean(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s || null;
}

function validYear(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 1800 && n < 2100 ? n : null;
}

function score({ artist, title, label, country, releasedYear }) {
  let s = 25;
  if (artist) s += 20;
  if (title) s += 20;
  if (label) s += 12;
  if (country) s += 8;
  if (releasedYear) s += 8;
  if (releasedYear && releasedYear < 1960) s += 12;
  else if (releasedYear && releasedYear < 1980) s += 8;
  else if (releasedYear && releasedYear < 2000) s += 4;
  return Math.max(1, Math.min(100, Math.round(s)));
}

function grade(s) {
  if (s >= 90) return "Elite";
  if (s >= 75) return "Very Rare";
  if (s >= 60) return "Rare";
  if (s >= 40) return "Uncommon";
  return "Common";
}

async function getProgress() {
  const { data, error } = await supabase
    .from("warehouse_intelligence_progress")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) throw error;
  return data;
}

async function saveProgress(nextOffset, totalProcessed) {
  const { error } = await supabase
    .from("warehouse_intelligence_progress")
    .upsert({
      id: 1,
      source_table: SOURCE_TABLE,
      next_offset: nextOffset,
      total_processed: totalProcessed,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;
}

async function createRun(startOffset) {
  const { data, error } = await supabase
    .from("warehouse_intelligence_runs")
    .insert({
      source_table: SOURCE_TABLE,
      target_table: TARGET_TABLE,
      status: "running",
      start_offset: startOffset,
      next_offset: startOffset,
      batch_size: BATCH_SIZE,
      batches_requested: MAX_BATCHES
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function updateRun(id, payload) {
  const { error } = await supabase
    .from("warehouse_intelligence_runs")
    .update(payload)
    .eq("id", id);

  if (error) throw error;
}

async function runBatch(offset) {
  const { data: rows, error } = await supabase
    .from(SOURCE_TABLE)
    .select("*")
    .range(offset, offset + BATCH_SIZE - 1);

  if (error) throw error;

  if (!rows?.length) {
    return { processed: 0, nextOffset: offset, exhausted: true };
  }

  const payload = rows.map((r, i) => {
    const artist = clean(r.artist ?? r.master_artist ?? r.artists ?? r.name);
    const title = clean(r.title ?? r.master_title ?? r.release_title);
    const label = clean(r.label ?? r.labels ?? r.primary_label);
    const country = clean(r.country ?? r.release_country);
    const releasedYear = validYear(r.released_year ?? r.year ?? r.release_year);
    const warehouseId = Number(r.release_id ?? r.master_id ?? r.discogs_id ?? r.id ?? offset + i + 1);
    const rarity = score({ artist, title, label, country, releasedYear });

    return {
      warehouse_release_id: warehouseId,
      artist,
      title,
      label,
      country,
      released_year: releasedYear,
      warehouse_rarity_score: rarity,
      artist_release_count: null,
      label_release_count: null,
      country_release_count: null,
      global_rank: offset + i + 1,
      collector_grade: grade(rarity),
      computed_at: new Date().toISOString()
    };
  });

  const { error: upsertError } = await supabase
    .from(TARGET_TABLE)
    .upsert(payload, { onConflict: "warehouse_release_id" });

  if (upsertError) throw upsertError;

  return {
    processed: payload.length,
    nextOffset: offset + payload.length,
    exhausted: payload.length < BATCH_SIZE
  };
}

const progress = await getProgress();
let offset = Number(progress.next_offset || 0);
let totalProcessed = Number(progress.total_processed || 0);
let runProcessed = 0;
let batchesCompleted = 0;

const runId = await createRun(offset);

console.log("WAREHOUSE INTELLIGENCE V2 START", {
  offset,
  totalProcessed,
  batchSize: BATCH_SIZE,
  maxBatches: MAX_BATCHES
});

try {
  for (let i = 0; i < MAX_BATCHES; i++) {
    console.log(`BATCH ${i + 1}/${MAX_BATCHES} OFFSET ${offset}`);
    const result = await runBatch(offset);
    console.log("BATCH_DONE", result);

    offset = result.nextOffset;
    totalProcessed += result.processed;
    runProcessed += result.processed;
    batchesCompleted++;

    await saveProgress(offset, totalProcessed);
    await updateRun(runId, {
      next_offset: offset,
      batches_completed: batchesCompleted,
      rows_processed: runProcessed
    });

    if (result.exhausted) break;
  }

  await updateRun(runId, {
    status: "completed",
    next_offset: offset,
    batches_completed: batchesCompleted,
    rows_processed: runProcessed,
    finished_at: new Date().toISOString()
  });

  console.log("WAREHOUSE INTELLIGENCE V2 COMPLETE", {
    runProcessed,
    totalProcessed,
    nextOffset: offset
  });
} catch (err) {
  await updateRun(runId, {
    status: "failed",
    error_message: err?.message || String(err),
    next_offset: offset,
    rows_processed: runProcessed,
    finished_at: new Date().toISOString()
  });

  console.error(err);
  process.exit(1);
}
