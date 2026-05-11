"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../src/lib/supabase/server";

type DiscogsPriceSuggestion = {
  value?: number | string | null;
};

type RecordRow = {
  id: string;
  discogs_release_id: string | number | null;
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

function getSafeReturnTo(value: FormDataEntryValue | null): string {
  const raw = String(value || "").trim();

  if (raw.startsWith("/collection")) {
    return raw;
  }

  return "/collection";
}

function buildDetailRedirect(id: string, status: string, returnTo: string): string {
  const params = new URLSearchParams();
  params.set("marketStatus", status);
  params.set("returnTo", returnTo);

  return `/collection/${id}?${params.toString()}`;
}

function redirectBack(id: string, status: string, returnTo: string): never {
  redirect(buildDetailRedirect(id, status, returnTo));
}

export async function pullSingleDiscogsValue(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id") || "").trim();
  const returnTo = getSafeReturnTo(formData.get("returnTo"));

  if (!id) {
    redirect(`/collection?marketStatus=missing-record-id`);
  }

  const token = process.env.DISCOGS_TOKEN;
  const userAgent =
    process.env.DISCOGS_USER_AGENT ?? "CollectorIntelligence/1.0";

  if (!token) {
    redirectBack(id, "missing-discogs-token", returnTo);
  }

  const { data: record, error: recordError } = await supabase
    .from("records_clean_safe")
    .select("id, discogs_release_id")
    .eq("id", id)
    .single();

  if (recordError || !record) {
    redirectBack(id, "record-not-found", returnTo);
  }

  const releaseId = String((record as RecordRow).discogs_release_id || "").trim();

  if (!releaseId) {
    await supabase
      .from("records_clean_safe")
      .update({
        value_pull_status: "missing_release_id",
        value_pull_note: "No Discogs release ID is stored for this record.",
        value_pull_last_attempted_at: new Date().toISOString(),
      })
      .eq("id", id);

    redirectBack(id, "missing-discogs-release-id", returnTo);
  }

  const priceRes = await fetch(
    `https://api.discogs.com/marketplace/price_suggestions/${releaseId}`,
    {
      headers: {
        Authorization: `Discogs token=${token}`,
        "User-Agent": userAgent,
      },
      cache: "no-store",
    }
  );

  if (!priceRes.ok) {
    await supabase
      .from("records_clean_safe")
      .update({
        value_pull_status: "discogs_error",
        value_pull_note: `Discogs price suggestion request failed with HTTP ${priceRes.status}.`,
        value_pull_last_attempted_at: new Date().toISOString(),
      })
      .eq("id", id);

    redirectBack(id, `discogs-price-fetch-failed-${priceRes.status}`, returnTo);
  }

  const suggestions = (await priceRes.json()) as Record<
    string,
    DiscogsPriceSuggestion
  >;

  const entries = Object.entries(suggestions);

  if (entries.length === 0) {
    await supabase
      .from("records_clean_safe")
      .update({
        value_pull_status: "no_discogs_value_available",
        value_pull_note: "Discogs returned no price suggestions for this release.",
        value_pull_last_attempted_at: new Date().toISOString(),
      })
      .eq("id", id);

    redirectBack(id, "no-discogs-value-available", returnTo);
  }

  const values = entries
    .map(([, entry]) => toNumber(entry?.value))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  if (values.length === 0) {
    await supabase
      .from("records_clean_safe")
      .update({
        value_pull_status: "no_discogs_value_available",
        value_pull_note:
          "Discogs returned price suggestions, but none contained usable numeric values.",
        value_pull_last_attempted_at: new Date().toISOString(),
      })
      .eq("id", id);

    redirectBack(id, "no-usable-discogs-values", returnTo);
  }

  const low = Number(values[0].toFixed(2));
  const high = Number(values[values.length - 1].toFixed(2));
  const median = Number(values[Math.floor(values.length / 2)].toFixed(2));

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
      }
    );

    if (statsRes.ok) {
      const stats = await statsRes.json();

      forSale =
        typeof stats.num_for_sale === "number" ? stats.num_for_sale : null;

      lastSoldDate =
        typeof stats.last_sold_date === "string" ? stats.last_sold_date : null;
    }
  } catch {
    // Stats are helpful but not required.
  }

    const spread = high - low;

  const activityDays =
    lastSoldDate
      ? Math.floor(
          (Date.now() - new Date(lastSoldDate).getTime()) / 86400000
        )
      : null;

  let marketSignal = "Monitor";
  let marketSignalReason =
    "Market data exists but no strong signal has been detected.";

  if (forSale !== null && forSale <= 2 && median >= 40) {
    marketSignal = "Hot Thin Market";
    marketSignalReason =
      "Very low supply combined with meaningful value suggests scarcity and strong collector interest.";
  } else if (forSale !== null && forSale <= 2) {
    marketSignal = "Thin Market";
    marketSignalReason =
      "Very few copies are currently listed for sale.";
  } else if (spread >= 50) {
    marketSignal = "Volatile Market";
    marketSignalReason =
      "Large spread between low and high values suggests pricing volatility.";
  } else if (forSale !== null && forSale >= 25) {
    marketSignal = "Saturated Market";
    marketSignalReason =
      "Large number of copies currently listed for sale.";
  } else if (activityDays !== null && activityDays <= 180) {
    marketSignal = "Active Market";
    marketSignalReason =
      "Recent sales activity suggests current collector demand.";
  } else if (activityDays !== null && activityDays > 730) {
    marketSignal = "Quiet Market";
    marketSignalReason =
      "Sales activity appears limited or stale.";
  }
    let nextRefreshDueAt = new Date();

  if (marketSignal === "Hot Thin Market") {
    nextRefreshDueAt.setDate(nextRefreshDueAt.getDate() + 1);
  } else if (marketSignal === "Active Market") {
    nextRefreshDueAt.setDate(nextRefreshDueAt.getDate() + 7);
  } else if (marketSignal === "Volatile Market") {
    nextRefreshDueAt.setDate(nextRefreshDueAt.getDate() + 7);
  } else if (marketSignal === "Saturated Market") {
    nextRefreshDueAt.setDate(nextRefreshDueAt.getDate() + 30);
  } else {
    nextRefreshDueAt.setDate(nextRefreshDueAt.getDate() + 14);
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("records_clean_safe")
    .update({
      discogs_low_price: low,
      discogs_median_price: median,
      discogs_high_price: high,
      estimated_value: median,
      value_source: "Discogs single-record pull",
      value_last_updated: now,
      discogs_for_sale: forSale,
      discogs_last_sold_date: lastSoldDate,
            market_signal: marketSignal,
      market_signal_reason: marketSignalReason,
      market_signal_updated_at: now,
      market_spread: spread,
      market_activity_days: activityDays,
      next_refresh_due_at: nextRefreshDueAt.toISOString(),
      value_pull_status: "pulled_successfully",
      value_pull_note: "Discogs single-record value pull completed successfully.",
      value_pull_last_attempted_at: now,
    })
    .eq("id", id);

  if (updateError) {
    await supabase
      .from("records_clean_safe")
      .update({
        value_pull_status: "discogs_error",
        value_pull_note: `Database update failed: ${updateError.message}`,
        value_pull_last_attempted_at: new Date().toISOString(),
      })
      .eq("id", id);

    redirectBack(id, "database-update-failed", returnTo);
  }

  revalidatePath(`/collection/${id}`);
  revalidatePath("/collection");
  revalidatePath("/collection/market-intelligence");
  revalidatePath("/collection/value-dashboard");
  revalidatePath("/collection/value-queue");

  redirectBack(id, "updated", returnTo);
}