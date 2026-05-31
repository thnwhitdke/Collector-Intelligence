import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

const DISCOGS_API_BASE = "https://api.discogs.com";

type WantItem = {
  id: number;
  user_id: string;
  discogs_release_id: number;
  marketplace_lowest_price: number | null;
  marketplace_for_sale_count: number | null;
  marketplace_url: string | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getDiscogsHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "User-Agent": process.env.DISCOGS_USER_AGENT || "CollectorIntelligence/1.0",
    Accept: "application/json",
  };

  if (process.env.DISCOGS_TOKEN) {
    headers.Authorization = `Discogs token=${process.env.DISCOGS_TOKEN}`;
  }

  return headers;
}

async function fetchMarketplaceStats(releaseId: number) {
  const marketplaceUrl = `https://www.discogs.com/sell/release/${releaseId}`;

  try {
    const response = await fetch(
      `${DISCOGS_API_BASE}/marketplace/stats/${releaseId}`,
      {
        headers: getDiscogsHeaders(),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        lowestPrice: null,
        currency: "USD",
        forSale: null,
        marketplaceUrl,
        error: `Discogs marketplace stats failed: ${response.status}`,
      };
    }

    const json = await response.json();

    const lowest =
      json.lowest_price && typeof json.lowest_price === "object"
        ? json.lowest_price
        : null;

    return {
      ok: true,
      status: response.status,
      lowestPrice: toNumber(lowest?.value),
      currency:
        typeof lowest?.currency === "string"
          ? lowest.currency
          : "USD",
      forSale:
        typeof json.num_for_sale === "number"
          ? json.num_for_sale
          : null,
      marketplaceUrl,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      lowestPrice: null,
      currency: "USD",
      forSale: null,
      marketplaceUrl,
      error: error instanceof Error ? error.message : "Unknown marketplace error",
    };
  }
}

async function fetchReleaseCommunity(releaseId: number) {
  try {
    const response = await fetch(`${DISCOGS_API_BASE}/releases/${releaseId}`, {
      headers: getDiscogsHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        have: null,
        want: null,
        error: `Discogs release lookup failed: ${response.status}`,
      };
    }

    const json = await response.json();

    const community =
      json.community && typeof json.community === "object"
        ? json.community
        : null;

    return {
      ok: true,
      status: response.status,
      have: toNumber(community?.have),
      want: toNumber(community?.want),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      have: null,
      want: null,
      error: error instanceof Error ? error.message : "Unknown community error",
    };
  }
}

function calculateRarityScore(forSale: number | null, price: number | null) {
  const supplyScore =
    forSale === null
      ? 35
      : forSale <= 0
        ? 100
        : forSale <= 1
          ? 95
          : forSale <= 2
            ? 90
            : forSale <= 5
              ? 80
              : forSale <= 10
                ? 68
                : forSale <= 25
                  ? 48
                  : forSale <= 50
                    ? 28
                    : 12;

  const priceScore =
    price === null
      ? 0
      : price >= 1000
        ? 25
        : price >= 500
          ? 18
          : price >= 250
            ? 12
            : price >= 100
              ? 7
              : 0;

  return clamp(supplyScore + priceScore);
}

function calculateDemandScore(have: number | null, want: number | null) {
  if (want === null) return 35;

  const ratio = have && have > 0 ? want / have : want;

  const ratioScore =
    ratio >= 5
      ? 100
      : ratio >= 3
        ? 88
        : ratio >= 2
          ? 74
          : ratio >= 1
            ? 58
            : ratio >= 0.5
              ? 38
              : 22;

  const volumeBonus =
    want >= 1000
      ? 15
      : want >= 500
        ? 10
        : want >= 100
          ? 5
          : 0;

  return clamp(ratioScore + volumeBonus);
}

function buildMarketSignal({
  rarityScore,
  demandScore,
  pressure,
  forSale,
  price,
}: {
  rarityScore: number;
  demandScore: number;
  pressure: number;
  forSale: number | null;
  price: number | null;
}) {
  if (pressure >= 88) return "Ultra Rare / High Demand";
  if (rarityScore >= 90 && demandScore >= 70) return "Rare Demand Collision";
  if (forSale !== null && forSale <= 2) return "Severe Supply Constraint";
  if (demandScore >= 80) return "Demand Heat Rising";
  if (price !== null && price >= 1000) return "High-Cost Acquisition";
  if (pressure >= 65) return "Priority Watch";
  return "Market Monitored";
}

function buildHistorySignal({
  previousLowest,
  currentLowest,
  previousForSale,
  currentForSale,
  pressure,
}: {
  previousLowest: number | null;
  currentLowest: number | null;
  previousForSale: number | null;
  currentForSale: number | null;
  pressure: number;
}) {
  if (previousForSale === 0 && currentForSale && currentForSale > 0) {
    return "New Listing";
  }

  if (previousLowest && currentLowest && currentLowest < previousLowest * 0.85) {
    return "Price Drop";
  }

  if (previousForSale !== null && currentForSale !== null && currentForSale < previousForSale) {
    return "Supply Tightening";
  }

  if (pressure >= 88) return "Ultra Rare / High Demand";

  if (currentForSale !== null && currentForSale <= 2) {
    return "Severe Supply Constraint";
  }

  return "Market Checked";
}

export async function GET() {
  const supabase = createAdminClient();

  const { data: wants, error } = await supabase
    .from("want_list")
    .select(`
      id,
      user_id,
      discogs_release_id,
      marketplace_lowest_price,
      marketplace_for_sale_count,
      marketplace_url
    `)
    .eq("purchased", false)
    .order("last_sync_at", { ascending: true, nullsFirst: true })
    .limit(25);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        job: "want-intelligence-sync",
        error: error.message,
      },
      { status: 500 },
    );
  }

  let checked = 0;
  let updated = 0;
  let historyInserted = 0;
  let stoppedEarly = false;

  const results = [];

  for (const item of (wants || []) as WantItem[]) {
    checked++;

    const releaseId = Number(item.discogs_release_id);

    if (!Number.isFinite(releaseId)) {
      continue;
    }

    const stats = await fetchMarketplaceStats(releaseId);

    if (!stats.ok && stats.status === 429) {
      stoppedEarly = true;
      break;
    }

    await sleep(350);

    const community = await fetchReleaseCommunity(releaseId);

    if (!community.ok && community.status === 429) {
      stoppedEarly = true;
      break;
    }

    const rarityScore = calculateRarityScore(stats.forSale, stats.lowestPrice);
    const demandScore = calculateDemandScore(community.have, community.want);
    const acquisitionPressure = clamp(
      rarityScore * 0.45 + demandScore * 0.4 + (stats.lowestPrice ? Math.min(stats.lowestPrice / 50, 15) : 0),
    );

    const marketSignal = buildMarketSignal({
      rarityScore,
      demandScore,
      pressure: acquisitionPressure,
      forSale: stats.forSale,
      price: stats.lowestPrice,
    });

    const historySignal = buildHistorySignal({
      previousLowest: item.marketplace_lowest_price,
      currentLowest: stats.lowestPrice,
      previousForSale: item.marketplace_for_sale_count,
      currentForSale: stats.forSale,
      pressure: acquisitionPressure,
    });

    const syncError =
      stats.error || community.error || null;

    const { error: historyError } = await supabase
      .from("want_market_history")
      .insert({
        want_id: item.id,
        user_id: item.user_id,
        discogs_release_id: releaseId,
        lowest_price: stats.lowestPrice,
        for_sale: stats.forSale,
        want_count: community.want,
        have_count: community.have,
        marketplace_url: stats.marketplaceUrl,
        signal: historySignal,
      });

    if (!historyError) {
      historyInserted++;
    }

    const { error: updateError } = await supabase
      .from("want_list")
      .update({
        marketplace_lowest_price: stats.lowestPrice,
        marketplace_for_sale_count: stats.forSale,
        marketplace_currency: stats.currency,
        marketplace_url: stats.marketplaceUrl,
        discogs_low_price: stats.lowestPrice,
        estimated_value: stats.lowestPrice,
        rarity_score: rarityScore,
        demand_score: demandScore,
        acquisition_pressure: acquisitionPressure,
        market_signal: marketSignal,
        sync_status: syncError ? "degraded" : "synced",
        sync_error: syncError,
        last_sync_at: new Date().toISOString(),
        notes:
          community.have !== null || community.want !== null
            ? `Discogs community: ${community.have ?? 0} have / ${community.want ?? 0} want`
            : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (!updateError) {
      updated++;
    }

    results.push({
      releaseId,
      updated: !updateError,
      history: !historyError,
      signal: marketSignal,
      rarityScore,
      demandScore,
      acquisitionPressure,
      forSale: stats.forSale,
      lowestPrice: stats.lowestPrice,
      syncStatus: syncError ? "degraded" : "synced",
    });

    await sleep(600);
  }

  return NextResponse.json({
    ok: true,
    job: "want-intelligence-sync",
    checked,
    updated,
    historyInserted,
    stoppedEarly,
    results,
    timestamp: new Date().toISOString(),
  });
}
