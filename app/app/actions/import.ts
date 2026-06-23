"use server";

import { createClient } from "../../../src/lib/supabase/server";

type ImportRow = {
  artist: string;
  title: string;
  year?: number;
  label?: string;
  format?: string;
  discogs_release_id?: string;
};

const FREE_RECORD_LIMIT = 15;
const UNLIMITED_SUBSCRIPTION_TIERS = new Set([
  "collector",
  "founder",
  "lifetime",
  "internal",
]);

function normalize(str: string | null | undefined) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

async function getAuthenticatedUserId(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Not authenticated.");
  }

  return user.id;
}

async function enforceRecordLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  recordsToAdd = 1
) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_status")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Unable to verify subscription: ${profileError.message}`);
  }

  const tier = profile?.subscription_tier ?? "free";
  const status = profile?.subscription_status ?? "active";

  if (UNLIMITED_SUBSCRIPTION_TIERS.has(tier) && status === "active") {
    return;
  }

  const { count, error: countError } = await supabase
    .from("records_clean_safe")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) {
    throw new Error(`Unable to verify collection size: ${countError.message}`);
  }

  const currentCount = count ?? 0;

  if (currentCount + recordsToAdd > FREE_RECORD_LIMIT) {
    throw new Error(
      `Free plan limit reached. The Free plan includes all features for up to ${FREE_RECORD_LIMIT} records. Visit /upgrade to unlock unlimited records with Collector.`
    );
  }
}

export async function importRecords(rows: ImportRow[]) {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  await enforceRecordLimit(supabase, userId, rows.length);

  let inserted = 0;
  let flagged = 0;

  for (const row of rows) {
    const normArtist = normalize(row.artist);
    const normTitle = normalize(row.title);

    const { data: existing } = await supabase
      .from("records_clean_safe")
      .select("id, artist, title")
      .eq("user_id", userId)
      .ilike("artist", `%${row.artist}%`)
      .ilike("title", `%${row.title}%`)
      .limit(5);

    let isDuplicate = false;

    if (existing && existing.length > 0) {
      for (const rec of existing) {
        const a = normalize(rec.artist);
        const t = normalize(rec.title);

        if (a === normArtist && t === normTitle) {
          isDuplicate = true;
          break;
        }
      }
    }

    if (isDuplicate) flagged++;

    await supabase.from("records_clean_safe").insert({
      user_id: userId,
      artist: row.artist,
      title: row.title,
      year_released: row.year || null,
      label: row.label || null,
      format: row.format || null,
      discogs_release_id: row.discogs_release_id || null,
      possible_duplicate: isDuplicate,
    });

    inserted++;
  }

  return {
    inserted,
    flagged,
  };
}
