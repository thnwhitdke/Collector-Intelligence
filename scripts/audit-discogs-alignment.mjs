import "dotenv/config";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function looksSuspicious(row) {
  const artist = normalize(row.artist);
  const title = normalize(row.title);
  const discogsUrl = normalize(row.discogs_url);

  if (!row.discogs_url) return true;

  const artistWords = artist.split(" ").filter(Boolean).slice(0, 3);
  const titleWords = title.split(" ").filter(Boolean).slice(0, 4);

  const artistHit = artistWords.some((w) => discogsUrl.includes(w));
  const titleHit = titleWords.some((w) => discogsUrl.includes(w));

  return !(artistHit && titleHit);
}

async function loadAllRows() {
  const allRows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("records_clean")
      .select("id, artist, title, country, discogs_url, discogs_release_id, cover_url")
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allRows.push(...data);
    console.log(`Loaded rows ${from + 1} to ${from + data.length}...`);

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

async function run() {
  console.log("Auditing Discogs alignment...");

  const rows = await loadAllRows();
  console.log(`Total rows loaded: ${rows.length}`);

  const suspicious = rows.filter(looksSuspicious);

  console.log(`Suspicious rows found: ${suspicious.length}`);

  const headers = [
    "id",
    "artist",
    "title",
    "country",
    "discogs_release_id",
    "discogs_url",
    "cover_url",
  ];

  const csvLines = [
    headers.join(","),
    ...suspicious.map((row) =>
      headers
        .map((key) => {
          const value = row[key] ?? "";
          const safe = String(value).replace(/"/g, '""');
          return `"${safe}"`;
        })
        .join(",")
    ),
  ];

  fs.writeFileSync(
    "./discogs_alignment_audit.csv",
    csvLines.join("\n"),
    "utf8"
  );

  console.log("Wrote audit file: discogs_alignment_audit.csv");
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});