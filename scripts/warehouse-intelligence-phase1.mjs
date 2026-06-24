import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const BATCH_SIZE = Number(process.env.BATCH_SIZE || 5000);
const START_OFFSET = Number(process.env.START_OFFSET || 0);

function scoreRarity(artistCount, labelCount, countryCount) {
  let score = 100;

  score -= Math.min(artistCount || 0, 1000) * 0.03;
  score -= Math.min(labelCount || 0, 1000) * 0.02;
  score -= Math.min(countryCount || 0, 500) * 0.02;

  return Math.max(1, Math.min(100, Math.round(score)));
}

function grade(score) {
  if (score >= 90) return "Elite";
  if (score >= 75) return "Very Rare";
  if (score >= 60) return "Rare";
  if (score >= 40) return "Uncommon";
  return "Common";
}

console.log("WAREHOUSE INTELLIGENCE PHASE 1", { BATCH_SIZE, START_OFFSET });

const { data: rows, error } = await supabase
  .from("discogs_release_reference_vinyl")
  .select("id, release_id, artist, title, label, country, released_year")
  .range(START_OFFSET, START_OFFSET + BATCH_SIZE - 1);

if (error) {
  console.error(error);
  process.exit(1);
}

if (!rows?.length) {
  console.log("NO_ROWS");
  process.exit(0);
}

const artists = [...new Set(rows.map(r => r.artist).filter(Boolean))];
const labels = [...new Set(rows.map(r => r.label).filter(Boolean))];
const countries = [...new Set(rows.map(r => r.country).filter(Boolean))];

const artistCounts = new Map();
const labelCounts = new Map();
const countryCounts = new Map();

for (const artist of artists) {
  const { count } = await supabase
    .from("discogs_release_reference_vinyl")
    .select("*", { count: "exact", head: true })
    .eq("artist", artist);
  artistCounts.set(artist, count || 0);
}

for (const label of labels) {
  const { count } = await supabase
    .from("discogs_release_reference_vinyl")
    .select("*", { count: "exact", head: true })
    .eq("label", label);
  labelCounts.set(label, count || 0);
}

for (const country of countries) {
  const { count } = await supabase
    .from("discogs_release_reference_vinyl")
    .select("*", { count: "exact", head: true })
    .eq("country", country);
  countryCounts.set(country, count || 0);
}

const payload = rows.map((r, i) => {
  const artistCount = artistCounts.get(r.artist) || 0;
  const labelCount = labelCounts.get(r.label) || 0;
  const countryCount = countryCounts.get(r.country) || 0;
  const rarity = scoreRarity(artistCount, labelCount, countryCount);

  return {
    warehouse_release_id: r.release_id || r.id,
    artist: r.artist,
    title: r.title,
    label: r.label,
    country: r.country,
    released_year: r.released_year,
    warehouse_rarity_score: rarity,
    artist_release_count: artistCount,
    label_release_count: labelCount,
    country_release_count: countryCount,
    global_rank: START_OFFSET + i + 1,
    collector_grade: grade(rarity),
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
