import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function show(title, query) {
  const { data, error } = await query;
  if (error) throw error;

  console.log(`\n${title}`);
  console.table(data);
}

await show(
  "LEGACY RECOVERY SUMMARY",
  supabase.from("legacy_recovery_summary").select("*")
);

await show(
  "TOP LEGACY ARTISTS",
  supabase
    .from("legacy_artist_intelligence")
    .select("*")
    .order("observations", { ascending: false })
    .limit(25)
);

await show(
  "MISSING LEGACY RELEASES SAMPLE",
  supabase
    .from("legacy_release_recovery")
    .select("artist,title,released_year,discogs_release_id,recovered")
    .eq("recovered", false)
    .order("artist", { ascending: true })
    .limit(25)
);
