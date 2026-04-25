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
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function readSuspiciousIds(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  if (lines.length < 2) return new Set();

  const headers = parseCsvLine(lines[0]);
  const idIndex = headers.indexOf("id");

  if (idIndex === -1) {
    throw new Error('Could not find "id" column in audit CSV.');
  }

  const ids = new Set();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const id = cols[idIndex]?.trim();
    if (id) ids.add(id);
  }

  return ids;
}

async function loadAllRows() {
  const allRows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("records_clean")
      .select("*")
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

async function insertInChunks(rows, chunkSize = 500) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    const { error } = await supabase
      .from("records_clean_safe")
      .insert(chunk);

    if (error) {
      console.error("Insert failed:", error);
      process.exit(1);
    }

    console.log(`Inserted ${Math.min(i + chunk.length, rows.length)} / ${rows.length}`);
  }
}

async function run() {
  console.log("Reading suspicious IDs from audit file...");
  const suspiciousIds = readSuspiciousIds("./discogs_alignment_audit.csv");
  console.log(`Suspicious IDs loaded: ${suspiciousIds.size}`);

  console.log("Loading full records_clean table...");
  const allRows = await loadAllRows();
  console.log(`Total rows loaded: ${allRows.length}`);

  const safeRows = allRows.filter((row) => !suspiciousIds.has(String(row.id)));

  console.log(`Safe rows to copy: ${safeRows.length}`);

  const { error: truncateError } = await supabase
    .from("records_clean_safe")
    .delete()
    .not("id", "is", null);

  if (truncateError) {
    console.error("Could not clear records_clean_safe:", truncateError);
    process.exit(1);
  }

  await insertInChunks(safeRows);

  console.log("Done.");
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});