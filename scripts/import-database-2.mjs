import "dotenv/config";
import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import { createClient } from "@supabase/supabase-js";

// ===============================
// CONFIG
// ===============================
const FILE_PATH = "./Cleaned_Import_Database.csv";
const TABLE_NAME = "records_clean";
const CHUNK_SIZE = 200;

// ===============================
// ENV VARIABLES
// ===============================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing environment variables.");
  process.exit(1);
}

// ===============================
// CONNECT TO SUPABASE
// ===============================
const supabase = createClient(supabaseUrl, serviceRoleKey);

// ===============================
// HELPERS
// ===============================
function cleanString(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function cleanId(value) {
  const s = cleanString(value);
  if (!s) return null;
  return s.replace(/\|/g, "").trim();
}

function cleanPrice(value) {
  const s = cleanString(value);
  if (!s) return null;
  return s.replace(/\$/g, "").replace(/,/g, "").trim();
}

// ===============================
// LOAD FILE (FIXED)
// ===============================
const absolutePath = path.resolve(FILE_PATH);

if (!fs.existsSync(absolutePath)) {
  console.error(`❌ File not found: ${absolutePath}`);
  process.exit(1);
}

let workbook;
try {
  workbook = xlsx.readFile(absolutePath);
} catch (err) {
  console.error("❌ Failed to read file:");
  console.error(err);
  process.exit(1);
}

const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const rows = xlsx.utils.sheet_to_json(worksheet, {
  defval: null,
  raw: false,
});

console.log(`📄 Rows read: ${rows.length}`);

// ===============================
// MAP DATA
// ===============================
const mapped = rows
  .map((row, index) => ({
    artist: cleanString(row["Artist"]),
    title: cleanString(row["Title"]),
    format: cleanString(row["Format"]),
    cover_present: cleanString(row["Cover Present"]),
    label: cleanString(row["Label"]),
    catalogue_number: cleanString(row["Catalogue Number"]),
    year_released: cleanString(row["Year Released"] || row["Year"]),
    country: cleanString(row["Country"]),
    notes: cleanString(row["Notes"]),
    sealed_status: cleanString(row["Sealed Status"]),
    discogs_url: cleanString(row["discogs URL"]),
    median_price: cleanPrice(row["Median Price"]),
    discogs_release_id: cleanId(row["discogs_release_id"]),
    discogs_master_id: cleanId(row["discogs_master_id"]),
    source_row_number: index + 2,
  }))
  .filter((r) => r.artist || r.title || r.discogs_release_id);

console.log(`🧹 Clean rows: ${mapped.length}`);

// ===============================
// INSERT
// ===============================
async function runImport() {
  for (let i = 0; i < mapped.length; i += CHUNK_SIZE) {
    const chunk = mapped.slice(i, i + CHUNK_SIZE);

    const { error } = await supabase.from(TABLE_NAME).insert(chunk);

    if (error) {
      console.error("❌ Insert error:");
      console.error(error);
      console.error("❌ Failed chunk sample:");
      console.log(chunk[0]);
      process.exit(1);
    }

    console.log(`✅ ${i + chunk.length}/${mapped.length}`);
  }

  console.log("🎉 Import complete!");
}

runImport();