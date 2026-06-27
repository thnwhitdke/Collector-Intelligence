import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BATCH_SIZE = Number(process.env.BATCH_SIZE || 1000);
const START_OFFSET = Number(process.env.START_OFFSET || 0);

console.log("FAST WAREHOUSE INTELLIGENCE PHASE 1", { BATCH_SIZE, START_OFFSET });

const { data: rows, error } = await supabase
  .from("discogs_master_reference")
  .select("*")
  .range(START_OFFSET, START_OFFSET + BATCH_SIZE - 1);

if (error) {
  console.error(error);
  process.exit(1);
}

if (!rows?.length) {
  console.log("NO_ROWS");
  process.exit(0);
}

const payload = rows.map((r, i) => {
  const artist = r.artist || r.master_artist || r.artists || null;
  const title = r.title || r.master_title || null;
  const label = r.label || r.labels || null;
  const country = r.country || null;
  const year = r.released_year || r.year || null;

  const rarityScore =
    artist && title ? 70 :
    title ? 55 :
    40;

  return {
    warehouse_release_id: r.release_id || r.master_id || r.id || START_OFFSET + i + 1,
    artist,
    title,
    label,
    country,
    released_year: year,
    warehouse_rarity_score: rarityScore,
    artist_release_count: null,
    label_release_count: null,
    country_release_count: null,
    global_rank: START_OFFSET + i + 1,
    collector_grade:
      rarityScore >= 90 ? "Elite" :
      rarityScore >= 75 ? "Very Rare" :
      rarityScore >= 60 ? "Rare" :
      rarityScore >= 40 ? "Uncommon" :
      "Common",
    computed_at: new Date().toISOString()
  };
});

const { error: upsertError } = await supabase
  .from("warehouse_release_intelligence")
  .upsert(payload, { onConflict: "warehouse_release_id" });

if (upsertError) {
  console.error(upsertError);
  process.exit(1);
}

console.log("DONE", {
  processed: payload.length,
  startOffset: START_OFFSET,
  nextOffset: START_OFFSET + payload.length
});
