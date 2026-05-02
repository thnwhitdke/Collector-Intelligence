"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";

type DiscogsPriceResponse = {
  lowest_price?: number | null;
};

type PriceHistoryEntry = {
  date: string;
  low: number;
  median: number;
  high: number;
  estimated: number;
  source: "Discogs";
};

type RecordForValuePull = {
  id: string;
  discogs_release_id: string | number | null;
  price_history: PriceHistoryEntry[] | null;
};

type PullResult = {
  updated: number;
  skipped: number;
  failed: number;
  message: string;
};

function getDiscogsToken() {
  const token = process.env.DISCOGS_TOKEN;

  if (!token) {
    throw new Error("Missing DISCOGS_TOKEN environment variable.");
  }

  return token;
}

function getDiscogsUserAgent() {
  return process.env.DISCOGS_USER_AGENT || "CollectorIntelligence/1.0";
}

function normalizePriceHistory(
  value: PriceHistoryEntry[] | null
): PriceHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry) =>
      typeof entry.date === "string" &&
      typeof entry.estimated === "number" &&
      typeof entry.low === "number" &&
      typeof entry.median === "number" &&
      typeof entry.high === "number"
  );
}

async function fetchDiscogsMedianPrice(
  releaseId: string
): Promise<number | null> {
  const token = getDiscogsToken();

  const response = await fetch(
    `https://api.discogs.com/marketplace/price_suggestions/${releaseId}`,
    {
      headers: {
        Authorization: `Discogs token=${token}`,
        "User-Agent": getDiscogsUserAgent(),
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as Record<
    string,
    DiscogsPriceResponse | undefined
  >;

  const prices = Object.values(data)
    .map((entry) => entry?.lowest_price)
    .filter((price): price is number => typeof price === "number");

  if (prices.length === 0) {
    return null;
  }

  prices.sort((a, b) => a - b);

  const middle = Math.floor(prices.length / 2);

  const median =
    prices.length % 2 === 0
      ? (prices[middle - 1] + prices[middle]) / 2
      : prices[middle];

  return Number(median.toFixed(2));
}

export async function pullDiscogsValuesBatch(): Promise<PullResult> {
  const supabase = await createClient();

  const { data: records, error } = await supabase
    .from("records_clean_safe")
    .select("id, discogs_release_id, price_history")
    .not("discogs_release_id", "is", null)
    .limit(10);

  if (error) {
    return {
      updated: 0,
      skipped: 0,
      failed: 1,
      message: `Supabase read failed: ${error.message}`,
    };
  }

  const safeRecords = (records || []) as RecordForValuePull[];

  if (safeRecords.length === 0) {
    return {
      updated: 0,
      skipped: 0,
      failed: 0,
      message: "No Discogs-linked records were found for value updates.",
    };
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const record of safeRecords) {
    const releaseId = String(record.discogs_release_id || "").trim();

    if (!releaseId) {
      skipped += 1;
      continue;
    }

    try {
      const medianPrice = await fetchDiscogsMedianPrice(releaseId);

      if (medianPrice === null) {
        skipped += 1;
        continue;
      }

      const lowPrice = Number((medianPrice * 0.75).toFixed(2));
      const highPrice = Number((medianPrice * 1.35).toFixed(2));

      const newHistoryEntry: PriceHistoryEntry = {
        date: new Date().toISOString(),
        low: lowPrice,
        median: medianPrice,
        high: highPrice,
        estimated: medianPrice,
        source: "Discogs",
      };

      const existingHistory = normalizePriceHistory(record.price_history);
      const nextHistory = [...existingHistory, newHistoryEntry].slice(-24);

      const { error: updateError } = await supabase
        .from("records_clean_safe")
        .update({
          discogs_low_price: lowPrice,
          discogs_median_price: medianPrice,
          discogs_high_price: highPrice,
          estimated_value: medianPrice,
          value_source: "Discogs",
          value_last_updated: new Date().toISOString(),
          price_history: nextHistory,
        })
        .eq("id", record.id);

      if (updateError) {
        failed += 1;
      } else {
        updated += 1;
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));
    } catch {
      failed += 1;
    }
  }

  revalidatePath("/collection/value-dashboard");
  revalidatePath("/collection");

  return {
    updated,
    skipped,
    failed,
    message: `Discogs trend pull complete. Updated ${updated}, skipped ${skipped}, failed ${failed}.`,
  };
}