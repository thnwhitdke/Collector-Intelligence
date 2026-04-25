"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../src/lib/supabase/server";

type DiscogsPriceSuggestion = {
  value?: number;
  currency?: string;
};

type DiscogsPriceSuggestionsResponse = Record<string, DiscogsPriceSuggestion>;

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getMedianEstimate(data: DiscogsPriceSuggestionsResponse): number | null {
  const preferred = ["Near Mint (NM or M-)", "Very Good Plus (VG+)", "Very Good (VG)"];

  for (const key of preferred) {
    const value = toNumber(data[key]?.value);
    if (value !== null) return value;
  }

  const allValues = Object.values(data)
    .map((entry) => toNumber(entry?.value))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  if (allValues.length === 0) return null;

  const middle = Math.floor(allValues.length / 2);
  return allValues.length % 2 === 0
    ? (allValues[middle - 1] + allValues[middle]) / 2
    : allValues[middle];
}

export async function getValueQueue() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("records_clean_safe")
    .select(
      `
      id,
      artist,
      title,
      format,
      year_released,
      discogs_release_id,
      estimated_value,
      value_last_updated,
      value_source,
      cover_url
    `
    )
    .not("discogs_release_id", "is", null)
    .order("value_last_updated", { ascending: true, nullsFirst: true })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function pullBatchDiscogsValues(limit = 10) {
  const supabase = await createClient();

  const token = process.env.DISCOGS_TOKEN;
  const userAgent = process.env.DISCOGS_USER_AGENT ?? "CollectorIntelligence/1.0";

  if (!token) {
    return {
      ok: false,
      message: "Missing DISCOGS_TOKEN in .env.local.",
      updated: 0,
      failed: 0,
    };
  }

  const { data: queue, error } = await supabase
    .from("records_clean_safe")
    .select("id, discogs_release_id, artist, title")
    .not("discogs_release_id", "is", null)
    .order("value_last_updated", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error) {
    return {
      ok: false,
      message: error.message,
      updated: 0,
      failed: 0,
    };
  }

  let updated = 0;
  let failed = 0;

  for (const record of queue ?? []) {
    try {
      const releaseId = record.discogs_release_id;

      const response = await fetch(
        `https://api.discogs.com/marketplace/price_suggestions/${releaseId}`,
        {
          headers: {
            Authorization: `Discogs token=${token}`,
            "User-Agent": userAgent,
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        failed += 1;
        continue;
      }

      const suggestions =
        (await response.json()) as DiscogsPriceSuggestionsResponse;

      const values = Object.values(suggestions)
        .map((entry) => toNumber(entry?.value))
        .filter((value): value is number => value !== null)
        .sort((a, b) => a - b);

      const low = values.length > 0 ? values[0] : null;
      const high = values.length > 0 ? values[values.length - 1] : null;
      const median = getMedianEstimate(suggestions);

      const { error: updateError } = await supabase
        .from("records_clean_safe")
        .update({
          discogs_low_price: low,
          discogs_median_price: median,
          discogs_high_price: high,
          estimated_value: median,
          value_source: "Discogs price suggestions",
          value_last_updated: new Date().toISOString(),
        })
        .eq("id", record.id);

      if (updateError) {
        failed += 1;
      } else {
        updated += 1;
      }
    } catch {
      failed += 1;
    }
  }

  revalidatePath("/collection/value-queue");
  revalidatePath("/collection");

  return {
    ok: true,
    message: `Updated ${updated} record(s). Failed ${failed}.`,
    updated,
    failed,
  };
}