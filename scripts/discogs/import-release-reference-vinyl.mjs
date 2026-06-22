import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "fs";
import readline from "readline";
import { createClient } from "@supabase/supabase-js";

const csvPath = "/Users/joehupp/collector-intelligence-data/discogs/release_reference_vinyl.csv";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function arr(v) {
  if (!v) return [];
  return [...new Set(v.split("|").map(x => x.trim()).filter(Boolean))];
}

const rl = readline.createInterface({
  input: fs.createReadStream(csvPath),
  crlfDelay: Infinity
});

let batch = [];
let total = 0;
let header = true;

async function flush() {
  if (!batch.length) return;

  const { error } = await supabase
    .from("release_reference")
    .upsert(batch, { onConflict: "source,source_release_id" });

  if (error) {
    console.error(error);
    process.exit(1);
  }

  total += batch.length;
  console.log(`imported ${total}`);
  batch = [];
}

for await (const line of rl) {
  if (header) {
    header = false;
    continue;
  }

  const [
    discogs_release_id,
    artist,
    title,
    year,
    country,
    format,
    label,
    catalog_number,
    genres,
    styles,
    master_id
  ] = parseCsvLine(line);

  batch.push({
    source: "discogs",
    source_release_id: Number(discogs_release_id),
    artist,
    title,
    release_year: year ? Number(year) : null,
    country,
    format,
    label,
    catalog_number,
    genres: arr(genres),
    styles: arr(styles),
    master_id: master_id ? Number(master_id) : null,
    intelligence_status: "new"
  });

  if (batch.length >= 500) await flush();
}

await flush();
console.log("DONE");
