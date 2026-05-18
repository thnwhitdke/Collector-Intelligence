"use server";

import { createClient } from "@/src/lib/supabase/server";

export async function generateSearchProfile(recordId: number) {
  const supabase = await createClient();

  // =========================
  // LOAD RECORD
  // =========================

  const { data: record, error: recordError } = await supabase
    .from("records_clean_safe")
    .select("*")
    .eq("id", recordId)
    .single();

  if (recordError || !record) {
    throw new Error("Record not found");
  }

  // =========================
  // BUILD SEARCH PARTS
  // =========================

  const parts = [
    record.artist,
    record.album_title,
    record.label,
    record.catalog_number,
    record.country,
    record.format,
    record.release_year,
  ]
    .filter(Boolean)
    .map((part: string) => String(part).trim());

  // =========================
  // RAW SEARCH STRING
  // =========================

  const rawSearch = parts.join(" ");

  // =========================
  // NORMALIZED FINGERPRINT
  // =========================

  const normalizedFingerprint = rawSearch
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // =========================
  // MARKET SEARCH QUERIES
  // =========================

  let formatSuffix = "";

const format = String(record.format || "").toLowerCase();

if (format.includes("vinyl")) {
  formatSuffix = "vinyl LP";
} else if (format.includes("lp")) {
  formatSuffix = "vinyl LP";
} else if (format.includes("7")) {
  formatSuffix = "7 inch single";
} else if (format.includes("12")) {
  formatSuffix = "12 inch";
} else if (format.includes("cd")) {
  formatSuffix = "CD";
} else if (format.includes("cassette")) {
  formatSuffix = "cassette";
} else {
  formatSuffix = "music";
}

const ebayQuery = `${rawSearch} ${formatSuffix}`;
  const discogsQuery = rawSearch;

  // =========================
  // KEYWORDS
  // =========================

  const keywords = normalizedFingerprint
    .split(" ")
    .filter(Boolean);

  // =========================
  // UPSERT PROFILE
  // =========================

  const { error: upsertError } = await supabase
    .from("market_search_profiles")
    .upsert({
      record_id: recordId,
      normalized_fingerprint: normalizedFingerprint,
      ebay_search_query: ebayQuery,
      discogs_search_query: discogsQuery,
      search_keywords: keywords,
      last_search_at: new Date().toISOString(),
    });

  if (upsertError) {
    throw upsertError;
  }

  return {
    success: true,
    recordId,
    rawSearch,
    normalizedFingerprint,
    ebayQuery,
    discogsQuery,
    keywords,
  };
}