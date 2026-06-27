import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const STATE_FILE = "logs/warehouse-metrics-state.json";

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { countedLogs: [] };
  }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function findImportLogs() {
  if (!fs.existsSync("logs")) return [];

  return fs
    .readdirSync("logs")
    .filter((name) =>
      /^parse-release-reference-vinyl.*\.log$/.test(name)
    )
    .map((name) => path.join("logs", name));
}

function extractVinylCount(logPath) {
  const text = fs.readFileSync(logPath, "utf8");

  const doneMax = text.match(/DONE MAX_ROWS\s+\{[^}]*vinyl:\s*([0-9]+)/);
  if (doneMax) return Number(doneMax[1]);

  const doneVinyl = text.match(/DONE vinyl\s+([0-9]+)/);
  if (doneVinyl) return Number(doneVinyl[1]);

  const jsonMatches = [...text.matchAll(/"vinyl"\s*:\s*([0-9]+)/g)];
  if (jsonMatches.length) {
    return Number(jsonMatches[jsonMatches.length - 1][1]);
  }

  return 0;
}

async function getCurrentMetrics() {
  const { data, error } = await supabase
    .from("release_warehouse_metrics")
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("METRICS READ FAILED", error);
    process.exit(1);
  }

  return data || {
    releases: 5000434,
    vinyl_releases: 5000434,
    artists: 757011,
    labels: 413591,
    countries: 254,
  };
}

async function replaceMetrics(payload) {
  await supabase.from("release_warehouse_metrics").delete().gte("releases", 0);

  const { error } = await supabase
    .from("release_warehouse_metrics")
    .insert(payload);

  if (error) {
    console.error("METRICS INSERT FAILED", error);
    process.exit(1);
  }
}

const state = readState();
const logs = findImportLogs();

let added = 0;
const newlyCounted = [];

for (const logPath of logs) {
  const key = path.basename(logPath);

  if (state.countedLogs.includes(key)) continue;

  const count = extractVinylCount(logPath);

  if (count > 0) {
    added += count;
    newlyCounted.push(key);
  }
}

const current = await getCurrentMetrics();

const payload = {
  releases: Number(current.releases || 0) + added,
  vinyl_releases: Number(current.vinyl_releases || 0) + added,
  artists: Number(current.artists || 757011),
  labels: Number(current.labels || 413591),
  countries: Number(current.countries || 254),
  refreshed_at: new Date().toISOString(),
};

if (added > 0) {
  await replaceMetrics(payload);
  state.countedLogs.push(...newlyCounted);
  writeState(state);
  console.log("WAREHOUSE METRICS UPDATED", { added, payload, newlyCounted });
} else {
  await replaceMetrics({ ...current, refreshed_at: new Date().toISOString() });
  console.log("WAREHOUSE METRICS REFRESHED — NO NEW IMPORT LOGS", current);
}
