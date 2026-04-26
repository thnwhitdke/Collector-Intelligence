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

function redirectBack(id: string, status: string): never {
  redirect(`/collection/${id}?marketStatus=${encodeURIComponent(status)}`);
}

export async function pullSingleDiscogsValue(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id") || "").trim();

  if (!id) {
    redirect("/collection?marketStatus=missing-record-id");
  }

  const token = process.env.DISCOGS_TOKEN;
  const userAgent =
    process.env.DISCOGS_USER_AGENT ?? "CollectorIntelligence/1.0";

  if (!token) {
    redirectBack(id, "missing-discogs-token");
  }

  const { data: record, error: recordError } = await supabase
    .from("records_clean_safe")
    .select("id, discogs_release_id")
    .eq("id", id)
    .single();

  if (recordError || !record) {
    redirectBack(id, "record-not-found");
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

    redirectBack(id, "missing-discogs-release-id");
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

    redirectBack(id, `discogs-price-fetch-failed-${priceRes.status}`);
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

    redirectBack(id, "no-discogs-value-available");
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

    redirectBack(id, "no-usable-discogs-values");
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

    redirectBack(id, "database-update-failed");
  }

  revalidatePath(`/collection/${id}`);
  revalidatePath("/collection");
  revalidatePath("/collection/market-intelligence");
  revalidatePath("/collection/value-dashboard");
  revalidatePath("/collection/value-queue");

  redirectBack(id, "updated");
}
