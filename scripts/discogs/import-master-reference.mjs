import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import zlib from "zlib";
import sax from "sax";
import { createClient } from "@supabase/supabase-js";

const input =
  "/Users/joehupp/collector-intelligence-data/discogs/discogs_20260601_masters.xml.gz";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const limit = Number(process.env.LIMIT || 0);
const batchSize = 500;

let current = null;
let text = "";
let path = [];
let batch = [];
let parsed = 0;

function clean(value) {
  const v = String(value || "").trim();
  return v || null;
}

async function flush() {
  if (!batch.length) return;

  const rows = batch;
  batch = [];

  const { error } = await supabase
    .from("discogs_master_reference")
    .upsert(rows, { onConflict: "master_id" });

  if (error) {
    console.error(error);
    process.exit(1);
  }

  console.log(`imported masters ${parsed}`);
}

const parser = sax.createStream(true, { trim: true });

parser.on("opentag", node => {
  path.push(node.name);
  text = "";

  if (node.name === "master") {
    current = {
      master_id: Number(node.attributes.id),
      main_release_id: null,
      artist: null,
      title: null,
      year: null,
      genres: [],
      styles: [],
      data_quality: null
    };
  }
});

parser.on("text", t => {
  text += t;
});

parser.on("closetag", name => {
  if (!current) {
    path.pop();
    return;
  }

  const parent = path[path.length - 2];

  if (name === "main_release") {
    const n = Number(text);
    if (Number.isFinite(n)) current.main_release_id = n;
  }

  if (name === "name" && parent === "artist" && !current.artist) {
    current.artist = clean(text);
  }

  if (name === "title" && parent === "master") {
    current.title = clean(text);
  }

  if (name === "year") {
    const n = Number.parseInt(text, 10);
    if (Number.isFinite(n)) current.year = n;
  }

  if (name === "genre") {
    const v = clean(text);
    if (v) current.genres.push(v);
  }

  if (name === "style") {
    const v = clean(text);
    if (v) current.styles.push(v);
  }

  if (name === "data_quality") {
    current.data_quality = clean(text);
  }

  if (name === "master") {
    batch.push({
      master_id: current.master_id,
      main_release_id: current.main_release_id,
      artist: current.artist,
      title: current.title,
      year: current.year,
      genres: [...new Set(current.genres)],
      styles: [...new Set(current.styles)],
      data_quality: current.data_quality
    });

    parsed++;

    if (parsed % 1000 === 0) console.log(`parsed masters ${parsed}`);

    current = null;

    if (limit && parsed >= limit) {
      fs.createReadStream(input).destroy;
    }
  }

  text = "";
  path.pop();
});

parser.on("end", async () => {
  await flush();
  console.log(`DONE masters import. Parsed ${parsed}`);
});

fs.createReadStream(input)
  .pipe(zlib.createGunzip())
  .pipe(parser)
  .on("finish", async () => {
    await flush();
    console.log(`DONE masters import. Parsed ${parsed}`);
    process.exit(0);
  });

const timer = setInterval(async () => {
  if (batch.length >= batchSize) {
    await flush();
  }

  if (limit && parsed >= limit) {
    await flush();
    console.log(`DONE sample masters ${parsed}`);
    process.exit(0);
  }
}, 1000);
