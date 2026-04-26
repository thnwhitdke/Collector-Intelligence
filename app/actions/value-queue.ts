"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../src/lib/supabase/server";

type DiscogsPriceSuggestion = {
  value?: number | string | null;
  currency?: string | null;
};

type DiscogsPriceSuggestionsResponse = Record<string, DiscogsPriceSuggestion>;

type QueueRecord = {
  id: string;
  artist: string | null;
  title: string | null;
  format: string | null;
  year_released: string | number | null;
  discogs_release_id: string | number | null;
  estimated_value: number | string | null;
  value_last_updated: string | null;
  value_source: string | null;
  cover_url: string | null;
  purchase_price?: number | string | null;
};

type PulledRecord = {
  id: string;
  artist: string;
  title: string;
  releaseId: string;
  low: number | null;
  median: number | null;
  high: number | null;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const cleaned = value.replace(/[$,]/g, "").trim();
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getMedianEstimate(data: DiscogsPriceSuggestionsResponse): number | null {
  const preferred = [
    "Near Mint (NM or M-)",
    "Very Good Plus (VG+)",
    "Very Good (VG)",
  ];

  for (const key of preferred) {
    const value = toNumber(data[key]?.value);
    if (value !== null) return Number(value.toFixed(2));
  }

  const allValues = Object.values(data)
    .map((entry) => toNumber(entry?.value))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  if (allValues.length === 0) return null;

  const middle = Math.floor(allValues.length / 2);

  const median =
    allValues.length % 2 === 0
      ? (allValues[middle - 1] + allValues[middle]) / 2
      : allValues[middle];

  return Number(median.toFixed(2));
}

function getQueuePriority(record: QueueRecord): number {
  const purchasePrice = toNumber(record.purchase_price);
  const estimatedValue = toNumber(record.estimated_value);

  const hasPurchasePrice = typeof purchasePrice === "number" && purchasePrice > 0;
  const hasEstimatedValue =
    typeof estimatedValue === "number" && estimatedValue > 0;

  if (hasPurchasePrice && !hasEstimatedValue) return 1;
  if (!hasEstimatedValue) return 2;
  if (!record.value_last_updated) return 3;

  return 4;
}

function getQueueReason(record: QueueRecord): string {
  const priority = getQueuePriority(record);

  if (priority === 1) {
    return "High priority: purchase price exists but estimated value is missing.";
  }

  if (priority === 2) {
    return "Needs value: Discogs release ID exists but estimated value is missing.";
  }

  if (priority === 3) {
    return "Needs refresh: value exists but last updated date is missing.";
  }

  return "Lower priority: existing value already present.";
}

function sortQueueRecords(records: QueueRecord[]) {
  return records
    .map((record) => ({
      ...record,
      queue_priority: getQueuePriority(record),
      queue_reason: getQueueReason(record),
    }))
    .sort((a, b) => {
      if (a.queue_priority !== b.queue_priority) {
        return a.queue_priority - b.queue_priority;
      }

      const aTime = a.value_last_updated
        ? new Date(a.value_last_updated).getTime()
        : 0;

      const bTime = b.value_last_updated
        ? new Date(b.value_last_updated).getTime()
        : 0;

      return aTime - bTime;
    });
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
      cover_url,
      purchase_price
    `
    )
    .not("discogs_release_id", "is", null)
    .limit(250);

  if (error) {
    throw new Error(error.message);
  }

  return sortQueueRecords((data ?? []) as QueueRecord[]).slice(0, 50);
}

export async function pullBatchDiscogsValues(limit = 10) {
  const supabase = await createClient();

  const token = process.env.DISCOGS_TOKEN;
  const userAgent =
    process.env.DISCOGS_USER_AGENT ?? "CollectorIntelligence/1.0";

  if (!token) {
    return {
      ok: false,
      message:
        "Missing DISCOGS_TOKEN in .env.local or Vercel Environment Variables.",
      updated: 0,
      skipped: 0,
      failed: 0,
      pulledRecords: [] as PulledRecord[],
      diagnostic: {
        attempted: 0,
        noReleaseId: 0,
        discogsHttpError: 0,
        emptySuggestions: 0,
        noUsableValues: 0,
        noMedian: 0,
        updateErrors: 0,
      },
    };
  }

  const fullQueue = await getValueQueue();
  const queue = fullQueue.slice(0, limit);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const pulledRecords: PulledRecord[] = [];

  const diagnostic = {
    attempted: queue.length,
    noReleaseId: 0,
    discogsHttpError: 0,
    emptySuggestions: 0,
    noUsableValues: 0,
    noMedian: 0,
    updateErrors: 0,
  };

  for (const record of queue) {
    try {
      const releaseId = String(record.discogs_release_id || "").trim();

      if (!releaseId) {
        diagnostic.noReleaseId += 1;
        skipped += 1;
        continue;
      }

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
        diagnostic.discogsHttpError += 1;
        skipped += 1;
        continue;
      }

      const suggestions =
        (await response.json()) as DiscogsPriceSuggestionsResponse;

      const suggestionEntries = Object.entries(suggestions);

      if (suggestionEntries.length === 0) {
        diagnostic.emptySuggestions += 1;
        skipped += 1;
        continue;
      }

      const values = suggestionEntries
        .map(([, entry]) => toNumber(entry?.value))
        .filter((value): value is number => value !== null)
        .sort((a, b) => a - b);

      if (values.length === 0) {
        diagnostic.noUsableValues += 1;
        skipped += 1;
        continue;
      }

      const low = Number(values[0].toFixed(2));
      const high = Number(values[values.length - 1].toFixed(2));
      const median = getMedianEstimate(suggestions);

      if (median === null) {
        diagnostic.noMedian += 1;
        skipped += 1;
        continue;
      }

      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("records_clean_safe")
        .update({
          discogs_low_price: low,
          discogs_median_price: median,
          discogs_high_price: high,
          estimated_value: median,
          value_source: "Discogs price suggestions",
          value_last_updated: now,
        })
        .eq("id", record.id);

      if (updateError) {
        diagnostic.updateErrors += 1;
        failed += 1;
      } else {
        updated += 1;
        pulledRecords.push({
          id: record.id,
          artist: record.artist || "Unknown Artist",
          title: record.title || "Untitled",
          releaseId,
          low,
          median,
          high,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));
    } catch {
      failed += 1;
    }
  }

  revalidatePath("/collection/value-queue");
  revalidatePath("/collection/value-dashboard");
  revalidatePath("/collection");

  const details = [
    `attempted ${diagnostic.attempted}`,
    `no release ID ${diagnostic.noReleaseId}`,
    `Discogs HTTP/API errors ${diagnostic.discogsHttpError}`,
    `empty suggestions ${diagnostic.emptySuggestions}`,
    `no usable price values ${diagnostic.noUsableValues}`,
    `no median ${diagnostic.noMedian}`,
    `database update errors ${diagnostic.updateErrors}`,
  ].join(", ");

  return {
    ok: true,
    message: `Diagnostic Discogs pull complete. Updated ${updated}, skipped ${skipped}, failed ${failed}. Details: ${details}.`,
    updated,
    skipped,
    failed,
    pulledRecords,
    diagnostic,
  };
}