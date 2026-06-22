import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(url, key);

async function safe(label, fn) {
  try {
    const result = await fn();

    if (result?.error) {
      console.log(`❌ ${label}`);
      console.dir(result.error, { depth: 10 });
      return;
    }

    console.log(`✅ ${label}`);
    if ("count" in result) console.log(result.count);
    if (result.data) console.table(result.data);
  } catch (err) {
    console.log(`💥 ${label}`);
    console.dir(err, { depth: 10 });
  }
}

await safe("release_reference sample", () =>
  supabase
    .from("release_reference")
    .select("source, source_release_id, artist, title, release_year, country, format, label")
    .limit(5)
);

await safe("release_reference total estimated", () =>
  supabase
    .from("release_reference")
    .select("source_release_id", { count: "estimated", head: true })
);

await safe("discogs rows estimated", () =>
  supabase
    .from("release_reference")
    .select("source_release_id", { count: "estimated", head: true })
    .eq("source", "discogs")
);

await safe("new intelligence rows estimated", () =>
  supabase
    .from("release_reference")
    .select("source_release_id", { count: "estimated", head: true })
    .eq("intelligence_status", "new")
);
