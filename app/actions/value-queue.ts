"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../src/lib/supabase/server";

type DiscogsPriceSuggestion = {
  value?: number | string | null;
  currency?: string | null;
};

type DiscogsPriceSuggestionsResponse = Record<string, DiscogsPriceSuggestion>;

type DiscogsStatsResponse = {
  num_for_sale?: number;
  last_sold_date?: string | null;
};

type DiscogsImage = {
  uri?: string | null;
  uri150?: string | null;
  type?: string | null;
};

type DiscogsReleaseResponse = {
  images?: DiscogsImage[];
};

export type ValuePullStatus =
  | "needs_pull"
  | "pulled_successfully"
  | "no_discogs_value_available"
  | "discogs_error"
  | "missing_release_id";

export type ValueQueueRecord = {
  id: string;
  artist: string | null;
  title: string | null;
  format: string | null;
  year_released: string | number | null;
  label: string | null;
  catalogue_number: string | null;
  discogs_release_id: string | number | null;
  estimated_value: number | string | null;
  discogs_low_price: number | string | null;
  discogs_median_price: number | string | null;
  discogs_high_price: number | string | null;
  value_last_updated: string | null;
  value_source: string | null;
  cover_url: string | null;
  purchase_price?: number | string | null;
  value_pull_status?: ValuePullStatus | string | null;
  value_pull_note?: string | null;
  value_pull_last_attempted_at?: string | null;
  discogs_sale_blocked?: boolean | null;
  discogs_sale_blocked_reason?: string | null;
  queue_priority: number;
};

type RawQueueRecord = Omit<ValueQueueRecord, "queue_priority">;

type PulledRecord = {
  id: string;
  artist: string;
  title: string;
  releaseId: string;
  low: number | null;
  median: number | null;
  high: number | null;
  forSale: number | null;
  lastSoldDate: string | null;
};

export type MissingCoverRecord = {
  id: string;
  artist: string | null;
  title: string | null;
  discogs_release_id: string | number | null;
  cover_url: string | null;
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

function hasUsableReleaseId(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return false;
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

function shouldIncludeInValueQueue(record: RawQueueRecord): boolean {
  if (record.discogs_sale_blocked === true) return false;
  if (!hasUsableReleaseId(record.discogs_release_id)) return false;

  if (record.value_pull_status === "pulled_successfully") return false;
  if (record.value_pull_status === "no_discogs_value_available") return false;

  const median = toNumber(record.discogs_median_price);
  const estimated = toNumber(record.estimated_value);

  const hasMissingMedian = median === null || median <= 0;
  const hasMissingEstimate = estimated === null || estimated <= 0;

  const retryable =
    !record.value_pull_status ||
    record.value_pull_status === "needs_pull" ||
    record.value_pull_status === "discogs_error" ||
    record.value_pull_status === "missing_release_id";

  return retryable || hasMissingMedian || hasMissingEstimate;
}

function getQueuePriority(record: RawQueueRecord): number {
  const purchasePrice = toNumber(record.purchase_price);
  const estimatedValue = toNumber(record.estimated_value);
  const discogsMedian = toNumber(record.discogs_median_price);

  const hasPurchasePrice = typeof purchasePrice === "number" && purchasePrice > 0;
  const hasEstimatedValue =
    typeof estimatedValue === "number" && estimatedValue > 0;
  const hasDiscogsMedian = typeof discogsMedian === "number" && discogsMedian > 0;

  if (record.discogs_sale_blocked === true) return 100;
  if (record.value_pull_status === "no_discogs_value_available") return 99;
  if (record.value_pull_status === "missing_release_id") return 98;
  if (record.value_pull_status === "discogs_error") return 1;

  if (hasPurchasePrice && !hasEstimatedValue) return 2;
  if (!hasDiscogsMedian) return 3;
  if (!hasEstimatedValue) return 4;
  if (!record.value_last_updated) return 5;

  return 6;
}

function sortQueueRecords(records: RawQueueRecord[]): ValueQueueRecord[] {
  return records
    .map((record) => ({
      ...record,
      queue_priority: getQueuePriority(record),
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

async function getCurrentUserId() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("User not authenticated.");
  }

  return user.id;
}

async function markPullStatus(
  id: string,
  status: ValuePullStatus,
  note: string,
) {
  const supabase = await createClient();
  const userId = await getCurrentUserId();

  await supabase
    .from("records_clean_safe")
    .update({
      value_pull_status: status,
      value_pull_note: note,
      value_pull_last_attempted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);
}

export async function getValueQueue() {
  const supabase = await createClient();
  const userId = await getCurrentUserId();

  const pageSize = 1000;
  const maxRowsToScan = 6000;
  const allRecords: RawQueueRecord[] = [];

  for (let start = 0; start < maxRowsToScan; start += pageSize) {
    const end = start + pageSize - 1;

    const { data, error } = await supabase
      .from("records_clean_safe")
      .select(
        `
        id,
        artist,
        title,
        format,
        year_released,
        label,
        catalogue_number,
        discogs_release_id,
        estimated_value,
        discogs_low_price,
        discogs_median_price,
        discogs_high_price,
        value_last_updated,
        value_source,
        cover_url,
        purchase_price,
        value_pull_status,
        value_pull_note,
        value_pull_last_attempted_at,
        discogs_sale_blocked,
        discogs_sale_blocked_reason
      `,
      )
      .eq("user_id", userId)
      .not("discogs_release_id", "is", null)
      .order("id", { ascending: true })
      .range(start, end);

    if (error) {
      throw new Error(error.message);
    }

    const records = (data ?? []) as RawQueueRecord[];
    allRecords.push(...records);

    if (records.length < pageSize) break;
  }

  const cleanQueue = allRecords.filter(shouldIncludeInValueQueue);

  return sortQueueRecords(cleanQueue).slice(0, 50);
}

export async function getMissingCoverQueue(limit = 50) {
  const supabase = await createClient();
  const userId = await getCurrentUserId();

  const pageSize = 1000;
  const maxRowsToScan = 6000;
  const allRecords: MissingCoverRecord[] = [];

  for (let start = 0; start < maxRowsToScan; start += pageSize) {
    const end = start + pageSize - 1;

    const { data, error } = await supabase
      .from("records_clean_safe")
      .select(
        `
        id,
        artist,
        title,
        discogs_release_id,
        cover_url
      `,
      )
      .eq("user_id", userId)
      .not("discogs_release_id", "is", null)
      .order("id", { ascending: true })
      .range(start, end);

    if (error) {
      throw new Error(error.message);
    }

    const records = ((data ?? []) as MissingCoverRecord[]).filter((record) => {
      const cover = typeof record.cover_url === "string" ? record.cover_url.trim() : "";
      return hasUsableReleaseId(record.discogs_release_id) && cover.length === 0;
    });

    allRecords.push(...records);

    if ((data ?? []).length < pageSize) break;
    if (allRecords.length >= limit) break;
  }

  return allRecords.slice(0, limit);
}

export async function pullBatchDiscogsValues(limit = 10) {
  const supabase = await createClient();
  const userId = await getCurrentUserId();

  const token = process.env.DISCOGS_TOKEN;
  const userAgent =
    process.env.DISCOGS_USER_AGENT ?? "CollectorIntelligence/1.0";

  if (!token) {
    return {
      ok: false,
      message: "Missing DISCOGS_TOKEN",
      updated: 0,
      skipped: 0,
      failed: 0,
      markedUnavailable: 0,
      pulledRecords: [] as PulledRecord[],
    };
  }

  const queue = (await getValueQueue()).slice(0, limit);

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let markedUnavailable = 0;

  const pulledRecords: PulledRecord[] = [];

  for (const record of queue) {
    try {
      if (record.discogs_sale_blocked === true) {
        skipped++;
        continue;
      }

      const releaseId = String(record.discogs_release_id || "").trim();

      if (!releaseId) {
        await markPullStatus(
          record.id,
          "missing_release_id",
          "No Discogs release ID is stored for this record.",
        );
        skipped++;
        continue;
      }

      const priceRes = await fetch(
        `https://api.discogs.com/marketplace/price_suggestions/${releaseId}`,
        {
          headers: {
            Authorization: `Discogs token=${token}`,
            "User-Agent": userAgent,
          },
          cache: "no-store",
        },
      );

      if (!priceRes.ok) {
        await markPullStatus(
          record.id,
          "discogs_error",
          `Discogs price suggestion request failed with HTTP ${priceRes.status}.`,
        );
        skipped++;
        continue;
      }

      const suggestions =
        (await priceRes.json()) as DiscogsPriceSuggestionsResponse;

      const suggestionEntries = Object.entries(suggestions);

      if (suggestionEntries.length === 0) {
        await markPullStatus(
          record.id,
          "no_discogs_value_available",
          "Discogs returned no price suggestions for this release.",
        );
        markedUnavailable++;
        skipped++;
        continue;
      }

      const values = suggestionEntries
        .map(([, entry]) => toNumber(entry?.value))
        .filter((value): value is number => value !== null)
        .sort((a, b) => a - b);

      if (values.length === 0) {
        await markPullStatus(
          record.id,
          "no_discogs_value_available",
          "Discogs returned price suggestions, but none contained usable numeric values.",
        );
        markedUnavailable++;
        skipped++;
        continue;
      }

      const low = Number(values[0].toFixed(2));
      const high = Number(values[values.length - 1].toFixed(2));
      const median = getMedianEstimate(suggestions);

      if (median === null) {
        await markPullStatus(
          record.id,
          "no_discogs_value_available",
          "Discogs returned values, but no median estimate could be calculated.",
        );
        markedUnavailable++;
        skipped++;
        continue;
      }

      let forSale: number | null = null;
      let lastSoldDate: string | null = null;

      try {
        const statsRes = await fetch(
          `https://api.discogs.com/marketplace/stats/${releaseId}`,
          {
            headers: {
              Authorization: `Discogs token=${token}`,
              "User-Agent": userAgent,
            },
            cache: "no-store",
          },
        );

        if (statsRes.ok) {
          const stats = (await statsRes.json()) as DiscogsStatsResponse;

          forSale =
            typeof stats.num_for_sale === "number"
              ? stats.num_for_sale
              : null;

          lastSoldDate = stats.last_sold_date ?? null;
        }
      } catch {
        // Stats are helpful but not required.
      }

      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("records_clean_safe")
        .update({
          discogs_low_price: low,
          discogs_median_price: median,
          discogs_high_price: high,
          estimated_value: median,
          value_source: "Discogs",
          value_last_updated: now,
          discogs_for_sale: forSale,
          discogs_last_sold_date: lastSoldDate,
          value_pull_status: "pulled_successfully",
          value_pull_note: "Discogs value pull completed successfully.",
          value_pull_last_attempted_at: now,
        })
        .eq("id", record.id)
        .eq("user_id", userId);

      if (updateError) {
        await markPullStatus(
          record.id,
          "discogs_error",
          `Database update failed: ${updateError.message}`,
        );
        failed++;
      } else {
        updated++;
        pulledRecords.push({
          id: record.id,
          artist: record.artist || "Unknown",
          title: record.title || "Untitled",
          releaseId,
          low,
          median,
          high,
          forSale,
          lastSoldDate,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));
    } catch {
      await markPullStatus(
        record.id,
        "discogs_error",
        "Unexpected error during Discogs value pull.",
      );
      failed++;
    }
  }

  revalidatePath("/collection");
  revalidatePath("/collection/value-dashboard");
  revalidatePath("/collection/value-queue");
  revalidatePath("/collection/market-intelligence");

  return {
    ok: true,
    message: `Updated ${updated}, marked unavailable ${markedUnavailable}, skipped ${skipped}, failed ${failed}.`,
    updated,
    skipped,
    failed,
    markedUnavailable,
    pulledRecords,
  };
}

export async function pullBatchMissingCovers(limit = 10) {
  const supabase = await createClient();
  const userId = await getCurrentUserId();

  const token = process.env.DISCOGS_TOKEN;
  const userAgent =
    process.env.DISCOGS_USER_AGENT ?? "CollectorIntelligence/1.0";

  if (!token) {
    return {
      ok: false,
      message: "Missing DISCOGS_TOKEN",
      updated: 0,
      skipped: 0,
      failed: 0,
      updatedRecords: [],
    };
  }

  const queue = await getMissingCoverQueue(limit);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const updatedRecords: {
    id: string;
    artist: string | null;
    title: string | null;
    coverUrl: string;
  }[] = [];

  for (const record of queue) {
    try {
      const releaseId = String(record.discogs_release_id ?? "").trim();

      if (!releaseId) {
        skipped++;
        continue;
      }

      const releaseRes = await fetch(
        `https://api.discogs.com/releases/${releaseId}`,
        {
          headers: {
            Authorization: `Discogs token=${token}`,
            "User-Agent": userAgent,
          },
          cache: "no-store",
        },
      );

      if (!releaseRes.ok) {
        failed++;
        continue;
      }

      const releaseData = (await releaseRes.json()) as DiscogsReleaseResponse;

      const primaryImage =
        releaseData.images?.find((image) => image.type === "primary") ??
        releaseData.images?.[0];

      const coverUrl =
        primaryImage?.uri?.trim() || primaryImage?.uri150?.trim();

      if (!coverUrl) {
        skipped++;
        continue;
      }

      const { error: updateError } = await supabase
        .from("records_clean_safe")
        .update({
          cover_url: coverUrl,
        })
        .eq("id", record.id)
        .eq("user_id", userId);

      if (updateError) {
        failed++;
      } else {
        updated++;
        updatedRecords.push({
          id: record.id,
          artist: record.artist,
          title: record.title,
          coverUrl,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));
    } catch {
      failed++;
    }
  }

  revalidatePath("/collection");
  revalidatePath("/collection/value-dashboard");
  revalidatePath("/collection/value-queue");
  revalidatePath("/collection/market-intelligence");

  return {
    ok: true,
    message: `Updated ${updated}, skipped ${skipped}, failed ${failed}.`,
    updated,
    skipped,
    failed,
    updatedRecords,
  };
}
