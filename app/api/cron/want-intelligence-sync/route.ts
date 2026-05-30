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

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

async function fetchMarketplaceStats(releaseId: number) {
  const marketplaceUrl = `https://www.discogs.com/sell/release/${releaseId}`;

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
  };
}

async function fetchReleaseCommunity(releaseId: number) {
  const response = await fetch(
    `${DISCOGS_API_BASE}/releases/${releaseId}`,
    {
      headers: getDiscogsHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      have: null,
      want: null,
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
  };
}

function buildSignal({
  previousLowest,
  currentLowest,
  previousForSale,
  currentForSale,
}: {
  previousLowest: number | null;
  currentLowest: number | null;
  previousForSale: number | null;
  currentForSale: number | null;
}) {
  if (
    previousForSale !== null &&
    currentForSale !== null &&
    previousForSale === 0 &&
    currentForSale > 0
  ) {
    return "🚨 New Listing";
  }

  if (
    previousLowest &&
    currentLowest &&
    currentLowest < previousLowest * 0.85
  ) {
    return "📉 Price Drop";
  }

  if (
    previousForSale !== null &&
    currentForSale !== null &&
    currentForSale <= 2
  ) {
    return "⚠ Thin Market";
  }

  if (
    previousForSale !== null &&
    currentForSale !== null &&
    currentForSale < previousForSale
  ) {
    return "🔥 Supply Tightening";
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
    .order("updated_at", { ascending: true, nullsFirst: true })
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

    const community = await fetchReleaseCommunity(releaseId);

    if (!community.ok && community.status === 429) {
      stoppedEarly = true;
      break;
    }

    const signal = buildSignal({
      previousLowest: item.marketplace_lowest_price,
      currentLowest: stats.lowestPrice,
      previousForSale: item.marketplace_for_sale_count,
      currentForSale: stats.forSale,
    });

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
        signal,
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
        notes:
          community.have || community.want
            ? `Discogs community: ${String(community.have ?? "0")} have / ${String(
                community.want ?? "0",
              )} want`
            : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("user_id", item.user_id);

    if (!updateError) {
      updated++;
    }

    results.push({
      want_id: item.id,
      release_id: releaseId,
      signal,
      lowestPrice: stats.lowestPrice,
      forSale: stats.forSale,
      want: community.want,
      have: community.have,
    });

    await sleep(1000);
  }

  return NextResponse.json({
    ok: true,
    job: "want-intelligence-sync",
    timestamp: new Date().toISOString(),
    checked,
    updated,
    historyInserted,
    stoppedEarly,
    results,
  });
}
