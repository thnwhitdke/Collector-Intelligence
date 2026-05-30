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
  artist?: string | null;
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

  const result =
    await pullSingleDiscogsCore(
      formData
    );

  const id = String(
    formData.get("id") || ""
  );

  const returnTo = String(
    formData.get("returnTo") ||
    "/collection"
  );

  if (
    result &&
    typeof result === "object" &&
    "status" in result
  ) {
    redirectBack(
      id,
      String(
        result.status
      ),
      returnTo
    );
  }

  return result;
}

export async function pullSingleDiscogsCore(formData: FormData) {
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
    return { ok:false, id, status:"missing-discogs-token" };
  }

  const { data: record, error: recordError } = await supabase
    .from("records_clean_safe")
    .select("id, discogs_release_id, artist")
    .eq("id", id)
    .single();

  if (recordError || !record) {
    return { ok:false, id, status:"record-not-found" };
  }

  const { discogs_release_id: releaseIdRaw, artist } = record as RecordRow;
  const releaseId = String(releaseIdRaw || "").trim();

  if (!releaseId) {
    await supabase
      .from("records_clean_safe")
      .update({
        value_pull_status: "missing_release_id",
        value_pull_note: "No Discogs release ID is stored for this record.",
        value_pull_last_attempted_at: new Date().toISOString(),
      })
      .eq("id", id);

    return { ok:false, id, status:"missing-discogs-release-id" };
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

    return { ok:false, id, status:`discogs-price-fetch-failed-${priceRes.status}` };
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

    return { ok:false, id, status:"no-discogs-value-available" };
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

    return { ok:false, id, status:"no-usable-discogs-values" };
  }

  const low = Number(values[0].toFixed(2));
  const high = Number(values[values.length - 1].toFixed(2));
  const median = Number(values[Math.floor(values.length / 2)].toFixed(2));

  let exactLowestPrice: number | null = null;


  
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
        typeof stats.num_for_sale === "number"
          ? stats.num_for_sale
          : null;

      exactLowestPrice =
        typeof stats.lowest_price?.value === "number"
          ? stats.lowest_price.value
          : null;

      lastSoldDate =
        typeof stats.last_sold_date === "string"
          ? stats.last_sold_date
          : null;
    }

    console.log(
      "PSMI MODE",
      "marketplace-stats-live",
      {
        forSale,
        exactLowestPrice
      }
    );

  } catch (error) {
    console.error(
      "MARKET FETCH ERROR",
      error
    );
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
  const { data: historyRows } = await supabase
    .from("market_history")
    .select("*")
    .eq("record_id", id)
    .order("captured_at", { ascending: false })
    .limit(2);

  const previousSnapshot =
    historyRows && historyRows.length > 0
      ? historyRows[0]
      : null;

  let marketValueChangePercent: number | null = null;
  let marketSupplyChange: number | null = null;
  let demandScore = 0;

if (median >= 20) {
  demandScore += 35;
}

if (forSale !== null && forSale < 15) {
  demandScore += 30;
}

if (
  activityDays !== null &&
  activityDays <= 14
) {
  demandScore += 20;
}
if (spread >= 20) {
  demandScore += 15;
}

let supplyPressure = 20;

if (forSale !== null && forSale <= 3) {
  supplyPressure = 95;
} else if (
  forSale !== null &&
  forSale <= 10
) {
  supplyPressure = 75;
} else if (
  forSale !== null &&
  forSale <= 25
) {
  supplyPressure = 45;
}

const volatilityScore =
  Math.min(
    Math.round(spread / 10),
    100
  );

let rarityIndex = 20;

if (
  forSale !== null &&
  forSale <= 5 &&
  median >= 50
)
 {
  rarityIndex = 95;
} else if (
  forSale !== null &&
  forSale <= 10
) {
  rarityIndex = 75;
} else if (
  forSale !== null &&
  forSale <= 25
) {
  rarityIndex = 50;
}

let collectorVelocity = 15;
let prestigeBonus = 0;

const artistName =
  (artist || "").toLowerCase();

if (artistName.includes("david bowie")) {
  prestigeBonus += 40;
}

if (artistName.includes("pink floyd")) {
  prestigeBonus += 45;
}

if (artistName.includes("beatles")) {
  prestigeBonus += 50;
}

if (artistName.includes("velvet underground")) {
  prestigeBonus += 40;
}

if (artistName.includes("led zeppelin")) {
  prestigeBonus += 45;
}



if (artistName.includes("miles davis")) {
  prestigeBonus += 45;
}

if (artistName.includes("radiohead")) {
  prestigeBonus += 35;
}

if (artistName.includes("bob dylan")) {
  prestigeBonus += 35;
}

if (
  activityDays !== null &&
  activityDays <= 7
) {
  collectorVelocity = 95;
} else if (
  activityDays !== null &&
  activityDays <= 30
) {
  collectorVelocity = 70;
} else if (
  activityDays !== null &&
  activityDays <= 90
) {
  collectorVelocity = 40;
}
const collectorIQScore =
  demandScore +
  rarityIndex +
  volatilityScore +
  collectorVelocity +
  prestigeBonus;
  
  let marketMomentum = "Stable";
  let marketTrend = "Flat";

  if (previousSnapshot) {

  const previousMedian =
    Number(previousSnapshot.discogs_median_price || 0);

  const previousSupply =
    Number(previousSnapshot.discogs_for_sale || 0);

  if (previousMedian > 0) {

    marketValueChangePercent =
      Number(
        (
          ((median - previousMedian) / previousMedian) *
          100
        ).toFixed(2)
      );
  }

  marketSupplyChange =
    forSale !== null
      ? forSale - previousSupply
      : null;

  if (
    demandScore >= 70 &&
    supplyPressure >= 70
  ) {

    marketMomentum = "Accelerating";
    marketTrend = "Bullish";

  } else if (
    volatilityScore >= 70
  ) {

    marketMomentum = "Volatile";
    marketTrend = "Unstable";

  } else if (
    collectorVelocity >= 70
  ) {

    marketMomentum = "Active";
    marketTrend = "Bullish";

  } else if (
    marketValueChangePercent !== null &&
    marketValueChangePercent <= -15
  ) {

    marketMomentum = "Cooling Down";
    marketTrend = "Bearish";

  } else if (
    marketSupplyChange !== null &&
    marketSupplyChange <= -5
  ) {

    marketMomentum = "Supply Compression";
    marketTrend = "Bullish";
  }
}

  const now = new Date().toISOString();
 console.log("PHASE 3 INTELLIGENCE DEBUG", {
  marketMomentum,
  demandScore,
  supplyPressure,
  volatilityScore,
  rarityIndex,
  collectorVelocity,
  prestigeBonus,
  collectorIQScore,
});

  const { error: updateError } = await supabase
    .from("records_clean_safe")
    .update({
      discogs_low_price: low,
      discogs_median_price: median,
      discogs_high_price: high,
      estimated_value: exactLowestPrice ?? median,
      value_source: "Discogs single-record pull",
      value_last_updated: now,
      discogs_for_sale: forSale,
      discogs_last_sold_date: lastSoldDate,
            market_signal: marketSignal,
      market_signal_reason: marketSignalReason,
      market_signal_updated_at: now,
      market_spread: spread,
      market_activity_days: activityDays,
            market_value_change_percent: marketValueChangePercent,
      market_supply_change: marketSupplyChange,
      market_momentum: marketMomentum,
      market_trend: marketTrend,
      demand_score: demandScore,
      supply_pressure: supplyPressure,
      volatility_score: volatilityScore,
      rarity_index: rarityIndex,

collector_velocity: collectorVelocity,
collector_iq_score: collectorIQScore,
      next_refresh_due_at: nextRefreshDueAt.toISOString(),
      value_pull_status: "pulled_successfully",
      value_pull_note: "Discogs single-record value pull completed successfully.",
      value_pull_last_attempted_at: now,
    })
   .eq("id", id);
  
   console.log("ATTEMPTING MARKET HISTORY INSERT");

const { data: historyData, error: historyError } = await supabase
  .from("market_history")
  .insert({
    record_id: id,

    discogs_low_price: low,
    discogs_median_price: median,
    discogs_high_price: high,

    discogs_for_sale: forSale,

    market_signal: marketSignal,

    captured_at: now,
  })
  .select();

if (historyError) {
  console.error("MARKET HISTORY INSERT ERROR:");
  console.error(historyError);
} else {
  console.log("MARKET HISTORY INSERT SUCCESS:");
  console.log(historyData);
}
  if (updateError) {
    await supabase
      .from("records_clean_safe")
      .update({
        value_pull_status: "discogs_error",
        value_pull_note: `Database update failed: ${updateError.message}`,
        value_pull_last_attempted_at: new Date().toISOString(),
      })
      .eq("id", id);

    return { ok:false, id, status:"database-update-failed" };
  }

  revalidatePath(`/collection/${id}`);
  revalidatePath("/collection");
  revalidatePath("/collection/market-intelligence");
  revalidatePath("/collection/value-dashboard");
  revalidatePath("/collection/value-queue");

  return {
    ok: true,
    id,
    status: "updated"
  };
}