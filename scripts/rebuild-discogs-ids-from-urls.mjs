import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function extractReleaseIdFromDiscogsValue(value) {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();

  // Case 1: real Discogs URL
  // Example: https://www.discogs.com/release/516112-Acting-Trio-Acting-Trio
  const urlMatch = trimmed.match(/\/release\/(\d+)/i);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Case 2: text export with [r123456]
  // Example: Aphrodite's Child ... [r3746691] | Discogs
  const bracketMatch = trimmed.match(/\[r(\d+)\]/i);
  if (bracketMatch) {
    return bracketMatch[1];
  }

  return null;
}

async function loadAllRows() {
  const allRows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("records_clean")
      .select(
        "id, title, artist, discogs_url, discogs_release_id, cover_url, discogs_resource_url, discogs_master_id"
      )
      .range(from, to);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    allRows.push(...data);
    console.log(`Loaded rows ${from + 1} to ${from + data.length}...`);

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allRows;
}

async function run() {
  console.log("Starting Discogs ID rebuild from discogs_url...");

  const rows = await loadAllRows();

  if (!rows || rows.length === 0) {
    console.log("No rows found.");
    process.exit(0);
  }

  console.log(`Total rows loaded: ${rows.length}`);

  let updated = 0;
  let skipped = 0;
  let missingValue = 0;
  let badValue = 0;

  for (const row of rows) {
    if (!row.discogs_url) {
      missingValue += 1;
      continue;
    }

    const extractedId = extractReleaseIdFromDiscogsValue(row.discogs_url);

    if (!extractedId) {
      badValue += 1;
      console.log(`Could not parse Discogs value for row ${row.id}: ${row.discogs_url}`);
      continue;
    }

    const currentId = row.discogs_release_id ? String(row.discogs_release_id) : null;

    const needsUpdate =
      currentId !== extractedId ||
      row.cover_url !== null ||
      row.discogs_resource_url !== null ||
      row.discogs_master_id !== null;

    if (!needsUpdate) {
      skipped += 1;
      continue;
    }

    const { error: updateError } = await supabase
      .from("records_clean")
      .update({
        discogs_release_id: extractedId,
        cover_url: null,
        discogs_resource_url: null,
        discogs_master_id: null,
      })
      .eq("id", row.id);

    if (updateError) {
      console.error(`Failed updating row ${row.id}:`, updateError);
      continue;
    }

    updated += 1;

    if (updated % 100 === 0) {
      console.log(`Updated ${updated} rows so far...`);
    }
  }

  console.log("Done.");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped already clean: ${skipped}`);
  console.log(`Missing discogs_url/discogs text: ${missingValue}`);
  console.log(`Bad unparseable values: ${badValue}`);
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});