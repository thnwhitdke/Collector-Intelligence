import fs from "fs";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(supabaseUrl, serviceKey);

const sourceFile = "thnwhitdke-collection-20260621-1620.csv";
const path = `scripts/imports/${sourceFile}`;

const csv = fs.readFileSync(path, "utf8");

const rows = parse(csv, {
  columns: true,
  skip_empty_lines: true,
  bom: true,
});

function cleanText(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).trim();
  return cleaned === "" ? null : cleaned;
}

function cleanInt(value) {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

const payload = rows.map((row) => ({
  source: "discogs_collection_export_reference",
  source_file: sourceFile,
  discogs_release_id: cleanInt(row.release_id),
  artist: cleanText(row.Artist),
  title: cleanText(row.Title),
  label: cleanText(row.Label),
  format: cleanText(row.Format),
  released_year: cleanInt(row.Released),
  media_condition: cleanText(row["Collection Media Condition"]),
  sleeve_condition: cleanText(row["Collection Sleeve Condition"]),
  folder: cleanText(row.CollectionFolder),
  date_added: cleanText(row["Date Added"]),
  raw_row: row,
}));

console.log(`Prepared ${payload.length} rows`);

const batchSize = 500;
let inserted = 0;

for (let i = 0; i < payload.length; i += batchSize) {
  const batch = payload.slice(i, i + batchSize);

  const { error } = await supabase
    .from("external_release_reference_items")
    .insert(batch);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  inserted += batch.length;
  console.log(`Inserted ${inserted}/${payload.length}`);
}

const { count, error: countError } = await supabase
  .from("external_release_reference_items")
  .select("*", { count: "exact", head: true })
  .eq("source_file", sourceFile);

if (countError) {
  console.error(countError);
  process.exit(1);
}

console.log(`✅ Import complete. Rows from this file now in table: ${count}`);
