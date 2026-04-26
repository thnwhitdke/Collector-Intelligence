"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";

type DiscogsPriceResponse = {
  lowest_price?: number | null;
  num_for_sale?: number | null;
  blocked_from_sale?: boolean;
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

async function fetchDiscogsLowestPrice(releaseId: string): Promise<number | null> {
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

  const values = Object.values(data)
    .map((entry) => entry?.lowest_price)
    .filter((price): price is number => typeof price === "number");

  if (values.length === 0) {
    return null;
  }

  values.sort((a, b) => a - b);

  const middle = Math.floor(values.length / 2);
  const median =
    values.length % 2 === 0
      ? (values[middle - 1] + values[middle]) / 2
      : values[middle];

  return Number(median.toFixed(2));
}

export async function pullDiscogsValuesBatch(): Promise<PullResult> {
  const supabase = await createClient();

  const { data: records, error } = await supabase
    .from("records_clean_safe")
    .select("id, discogs_release_id, purchase_price")
    .not("discogs_release_id", "is", null)
    .or("estimated_value.is.null,value_last_updated.is.null")
    .limit(10);

  if (error) {
    return {
      updated: 0,
      skipped: 0,
      failed: 1,
      message: `Supabase read failed: ${error.message}`,
    };
  }

  if (!records || records.length === 0) {
    return {
      updated: 0,
      skipped: 0,
      failed: 0,
      message: "No records currently need Discogs value updates.",
    };
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const record of records) {
    const releaseId = String(record.discogs_release_id || "").trim();

    if (!releaseId) {
      skipped += 1;
      continue;
    }

    try {
      const medianPrice = await fetchDiscogsLowestPrice(releaseId);

      if (medianPrice === null) {
        skipped += 1;
        continue;
      }

      const lowPrice = Number((medianPrice * 0.75).toFixed(2));
      const highPrice = Number((medianPrice * 1.35).toFixed(2));

      const { error: updateError } = await supabase
        .from("records_clean_safe")
        .update({
          discogs_low_price: lowPrice,
          discogs_median_price: medianPrice,
          discogs_high_price: highPrice,
          estimated_value: medianPrice,
          value_source: "Discogs",
          value_last_updated: new Date().toISOString(),
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
    message: `Discogs value pull complete. Updated ${updated}, skipped ${skipped}, failed ${failed}.`,
  };
}