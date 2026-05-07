"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../src/lib/supabase/server";

type DiscogsPriceSuggestion = {
  value?: number | string | null;
  currency?: string | null;
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

function getEstimatedValue(low: number | null, median: number | null, high: number | null) {
  if (median !== null) return median;
  if (low !== null && high !== null) return (low + high) / 2;
  if (low !== null) return low;
  if (high !== null) return high;
  return null;
}

function normalizeDiscogsId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  return null;
}

async function fetchDiscogsPriceSuggestions(releaseId: string) {
  const token = process.env.DISCOGS_TOKEN;
  const userAgent =
    process.env.DISCOGS_USER_AGENT ?? "CollectorIntelligence/1.0";

  if (!token) {
    throw new Error("Missing DISCOGS_TOKEN environment variable.");
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

  if (response.status === 404) {
    return {
      blocked: true,
      blockedReason: "Discogs price suggestions were not available for this release.",
      low: null,
      median: null,
      high: null,
    };
  }

  if (response.status === 429) {
    throw new Error("Discogs rate limit reached. Try a smaller batch or wait before pulling again.");
  }

  if (!response.ok) {
    throw new Error(`Discogs request failed with status ${response.status}.`);
  }

  const json = (await response.json()) as DiscogsPriceSuggestionsResponse;

  const low =
    toNumber(json?.Poor?.value) ??
    toNumber(json?.Fair?.value) ??
    toNumber(json?.Good?.value) ??
    null;

  const median =
    toNumber(json?.["Very Good Plus (VG+)"]?.value) ??
    toNumber(json?.["Near Mint (NM or M-)"]?.value) ??
    toNumber(json?.["Very Good (VG)"]?.value) ??
    null;

  const high =
    toNumber(json?.Mint?.value) ??
    toNumber(json?.["Near Mint (NM or M-)"]?.value) ??
    null;

  return {
    blocked: false,
    blockedReason: null,
    low,
    median,
    high,
  };
}

export async function pullNextDiscogsValues(batchSize = 5) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      message: "You must be signed in before pulling Discogs values.",
      updated: 0,
      blocked: 0,
      failed: 0,
    };
  }

  const safeBatchSize = Math.max(1, Math.min(batchSize, 10));

const { data: candidates, error } = await supabase
  .from("records_clean_safe")
  .select("id, discogs_release_id, estimated_value, discogs_median_price, discogs_sale_blocked")
  .eq("user_id", user.id)
  .not("discogs_release_id", "is", null)
  .eq("discogs_sale_blocked", false)
  .limit(100);

  const filteredCandidates = (candidates || []).filter((r) => {
  const median = toNumber(r.discogs_median_price);
  const estimate = toNumber(r.estimated_value);

  const missingMedian = median === null || median <= 0;
  const missingEstimate = estimate === null || estimate <= 0;

  return missingMedian || missingEstimate;
}).slice(0, safeBatchSize);

  if (error) {
    console.error("pullNextDiscogsValues candidate error:", error);
    return {
      ok: false,
      message: "Could not load records that need Discogs values.",
      updated: 0,
      blocked: 0,
      failed: 0,
    };
  }

  if (!candidates || candidates.length === 0) {
    return {
      ok: true,
      message: "No eligible records need a Discogs value pull right now.",
      updated: 0,
      blocked: 0,
      failed: 0,
    };
  }

  let updated = 0;
  let blocked = 0;
  let failed = 0;

  for (const candidate of filteredCandidates) {
    const id = String(candidate.id);
    const releaseId = normalizeDiscogsId(candidate.discogs_release_id);

    if (!releaseId) {
      failed += 1;
      continue;
    }

    try {
      const result = await fetchDiscogsPriceSuggestions(releaseId);

      if (result.blocked) {
        const { error: updateError } = await supabase
          .from("records_clean_safe")
          .update({
            discogs_sale_blocked: true,
            discogs_sale_blocked_reason: result.blockedReason,
            value_source: "discogs_unavailable",
            value_last_updated: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Discogs blocked update error:", updateError);
          failed += 1;
        } else {
          blocked += 1;
        }

        continue;
      }

      const estimatedValue = getEstimatedValue(
        result.low,
        result.median,
        result.high
      );

      const { error: updateError } = await supabase
        .from("records_clean_safe")
        .update({
          discogs_low_price: result.low,
          discogs_median_price: result.median,
          discogs_high_price: result.high,
          estimated_value: estimatedValue,
          value_source: "discogs_price_suggestions",
          value_last_updated: new Date().toISOString(),
          discogs_sale_blocked: false,
          discogs_sale_blocked_reason: null,
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Discogs value update error:", updateError);
        failed += 1;
      } else {
        updated += 1;
      }
    } catch (error) {
      console.error("Discogs pull failed:", error);
      failed += 1;
    }
  }

  revalidatePath("/collection/value-dashboard");
  revalidatePath("/collection/value-queue");
  revalidatePath("/collection");

  return {
    ok: failed === 0,
    message: `Discogs pull complete. Updated ${updated}, blocked ${blocked}, failed ${failed}.`,
    updated,
    blocked,
    failed,
  };
}