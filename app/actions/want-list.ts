"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../src/lib/supabase/server";

const DISCOGS_API_BASE = "https://api.discogs.com";

type WantListItem = {
  id: number;
  user_id: string;
  discogs_release_id: number;
  record_id?: number | null;
  artist: string | null;
  title: string | null;
  label: string | null;
  year_released: string | null;
  format: string | null;
  cover_url: string | null;
  discogs_url: string | null;
  discogs_low_price: number | null;
  discogs_median_price: number | null;
  discogs_high_price: number | null;
  estimated_value: number | null;
  marketplace_for_sale_count: number | null;
  marketplace_lowest_price: number | null;
  marketplace_currency: string | null;
  marketplace_url: string | null;
  notes: string | null;
  priority: string | null;
  purchased: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

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

function firstImageUrl(release: Record<string, unknown>): string | null {
  const images = release.images;
  if (!Array.isArray(images)) return null;

  const image =
    images.find(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        (entry as Record<string, unknown>).type === "primary"
    ) || images[0];

  if (!image || typeof image !== "object") return null;

  const record = image as Record<string, unknown>;
  if (typeof record.resource_url === "string") return record.resource_url;
  if (typeof record.uri === "string") return record.uri;
  if (typeof record.uri150 === "string") return record.uri150;

  return null;
}
async function fetchDiscogsRelease(
  releaseId: number,
) {
  const response = await fetch(
    `${DISCOGS_API_BASE}/releases/${releaseId}`,
    {
      headers: getDiscogsHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `Discogs release lookup failed: ${response.status}`,
    );
  }

  return (
    await response.json()
  ) as Record<
    string,
    unknown
  >;
}

async function fetchDiscogsListingCount(
  releaseId: number,
) {
  try {
    const response = await fetch(
      `${DISCOGS_API_BASE}/marketplace/listings?release_id=${releaseId}&page=1&per_page=1`,
      {
        headers: getDiscogsHeaders(),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      console.error(
        "Discogs listing lookup failed:",
        response.status,
        await response.text(),
      );

      return null;
    }

    const json =
      (await response.json()) as Record<
        string,
        unknown
      >;

    const pagination =
      json.pagination &&
      typeof json.pagination ===
        "object"
        ? (
            json.pagination as Record<
              string,
              unknown
            >
          )
        : null;

 return toNumber(pagination?.items);
  } catch (error) {
    console.error(
      "Discogs listing lookup crashed:",
      error,
    );

    return null;
  }
}

async function fetchDiscogsMarketplace(
  releaseId: number,
) {
  const marketplaceUrl =
    `https://www.discogs.com/sell/release/${releaseId}`;

  try {
    const response = await fetch(
      `${DISCOGS_API_BASE}/marketplace/stats/${releaseId}`,
      {
        headers: getDiscogsHeaders(),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      console.error(
        "Discogs marketplace lookup failed:",
        response.status,
        await response.text(),
      );

      return {
        lowestPrice: null,
        currency: "USD",
        marketplaceUrl,
      };
    }

    const json =
      (await response.json()) as Record<
        string,
        unknown
      >;

    const lowestPrice =
      json.lowest_price &&
      typeof json.lowest_price ===
        "object"
        ? (
            json.lowest_price as Record<
              string,
              unknown
            >
          )
        : null;

    return {
      lowestPrice:
        toNumber(
          lowestPrice?.value,
        ),
      currency:
        typeof lowestPrice?.currency ===
        "string"
          ? lowestPrice.currency
          : "USD",
      marketplaceUrl,
    };
  } catch (error) {
    console.error(
      "Discogs marketplace lookup crashed:",
      error,
    );

    return {
      lowestPrice: null,
      currency: "USD",
      marketplaceUrl,
    };
  }
}

function normalizeReleaseForWantList(
  releaseId: number,
  release: Record<string, unknown>,
  marketplace: Awaited<
    ReturnType<
      typeof fetchDiscogsMarketplace
    >
  >,
  listingCount: number | null,
) {
  const artists = Array.isArray(release.artists)
    ? release.artists
        .map((artist) =>
          artist && typeof artist === "object"
            ? (artist as Record<string, unknown>).name
            : null
        )
        .filter((name): name is string => typeof name === "string")
        .join(", ")
    : null;

  const labels = Array.isArray(release.labels)
    ? release.labels
        .map((label) =>
          label && typeof label === "object"
            ? (label as Record<string, unknown>).name
            : null
        )
        .filter((name): name is string => typeof name === "string")
        .join(", ")
    : null;

  const formats = Array.isArray(release.formats)
    ? release.formats
        .map((format) =>
          format && typeof format === "object"
            ? (format as Record<string, unknown>).name
            : null
        )
        .filter((name): name is string => typeof name === "string")
        .join(", ")
    : null;

  const community =
    release.community && typeof release.community === "object"
      ? (release.community as Record<string, unknown>)
      : null;

  const have = community?.have;
  const want = community?.want;

  return {
    discogs_release_id: releaseId,
    artist: artists,
    title: typeof release.title === "string" ? release.title : null,
    label: labels,
    year_released:
      typeof release.year === "number" || typeof release.year === "string"
        ? String(release.year)
        : null,
    format: formats,
    cover_url: firstImageUrl(release),
    discogs_url:
  typeof release.uri === "string"
    ? (
        release.uri.startsWith("http")
          ? release.uri
          : `https://www.discogs.com${release.uri}`
      )
    : `https://www.discogs.com/release/${releaseId}`,
    discogs_low_price: marketplace.lowestPrice,
    discogs_median_price: null,
    discogs_high_price: null,
    estimated_value: marketplace.lowestPrice,
    marketplace_for_sale_count:
    listingCount,
    marketplace_lowest_price: marketplace.lowestPrice,
    marketplace_currency: marketplace.currency,
    marketplace_url: marketplace.marketplaceUrl,
    notes:
      have || want
        ? `Discogs community: ${String(have ?? "0")} have / ${String(
            want ?? "0"
          )} want`
        : null,
    updated_at: new Date().toISOString(),
  };
}


function clampScore(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function calculateWantRarityScore(forSale: number | null, price: number | null) {
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

  return clampScore(supplyScore + priceScore);
}

function calculateWantDemandScore(notes: string | null | undefined) {
  if (!notes) return 35;

  const match = notes.match(/(\d+)\s+have\s+\/\s+(\d+)\s+want/i);

  if (!match) return 35;

  const have = Number(match[1]);
  const want = Number(match[2]);

  if (!Number.isFinite(want)) return 35;

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

  return clampScore(ratioScore + volumeBonus);
}

function buildWantSignal({
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

function buildWantIntelligence(
  forSale: number | null,
  price: number | null,
  notes: string | null | undefined,
) {
  const rarityScore = calculateWantRarityScore(forSale, price);
  const demandScore = calculateWantDemandScore(notes);
  const acquisitionPressure = clampScore(
    rarityScore * 0.45 +
      demandScore * 0.4 +
      (price ? Math.min(price / 50, 15) : 0),
  );

  return {
    rarity_score: rarityScore,
    demand_score: demandScore,
    acquisition_pressure: acquisitionPressure,
    market_signal: buildWantSignal({
      rarityScore,
      demandScore,
      pressure: acquisitionPressure,
      forSale,
      price,
    }),
    sync_status: "synced",
    sync_error: null,
    last_sync_at: new Date().toISOString(),
  };
}

export async function getWantList(): Promise<WantListItem[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  const { data, error } = await supabase
    .from("want_list")
    .select("*")
    .eq("user_id", user.id)
    .eq("purchased", false)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "getWantList error:",
      error.message,
    );

    return [];
  }

  const items =
    (data ??
      []) as WantListItem[];

  const discogsIds =
    items
      .map(
        (item) =>
          item.discogs_release_id,
      )
      .filter(Boolean);

  if (
    discogsIds.length === 0
  ) {
    return items;
  }

  const {
    data: recordMatches,
    error: recordError,
  } = await supabase
    .from(
      "records_clean_safe",
    )
    .select(
      "id, discogs_release_id",
    )
    .in(
      "discogs_release_id",
      discogsIds,
    );

  if (recordError) {
    console.error(
      "record match error:",
      recordError.message,
    );

    return items;
  }

  const recordMap =
    new Map<
      number,
      number
    >();

  (
    recordMatches ?? []
  ).forEach(
    (record) => {
      if (
        record.discogs_release_id
      ) {
        recordMap.set(
          Number(
            record.discogs_release_id,
          ),
          Number(record.id),
        );
      }
    },
  );

  return items.map(
    (item) => ({
      ...item,
      record_id:
        recordMap.get(
          item.discogs_release_id,
        ) ?? null,
    }),
  );
}

export async function addDiscogsReleaseToWantList(formData: FormData) {
  const releaseInput = String(formData.get("discogs_release_id") ?? "").trim();
  const priority = String(formData.get("priority") ?? "Medium").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const releaseId = Number(releaseInput.replace(/[^0-9]/g, ""));

  if (!Number.isFinite(releaseId) || releaseId <= 0) {
    throw new Error("Please enter a valid Discogs release ID.");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be signed in to use the want list.");
  }

  const release = await fetchDiscogsRelease(releaseId);
  const marketplace =
  await fetchDiscogsMarketplace(
    releaseId,
  );

const listingCount =
  await fetchDiscogsListingCount(
    releaseId,
  );
  const normalized = normalizeReleaseForWantList(
  releaseId,
  release,
  marketplace,
  listingCount,
);

  const { error } = await supabase.from("want_list").upsert(
    {
      user_id: user.id,
      ...normalized,
      priority: priority || "Medium",
      notes: notes || normalized.notes,
      purchased: false,
    },
    {
      onConflict: "user_id,discogs_release_id",
    }
  );

  if (error) {
    throw new Error(`Could not save want list item: ${error.message}`);
  }

  revalidatePath("/collection/want-list");
}

export async function refreshWantListItem(formData: FormData) {
  const id = Number(formData.get("id"));
  const releaseId = Number(formData.get("discogs_release_id"));

  if (!Number.isFinite(id) || !Number.isFinite(releaseId)) {
    throw new Error("Missing want list item ID.");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be signed in to refresh the want list.");
  }

  const release = await fetchDiscogsRelease(releaseId);
  const marketplace = await fetchDiscogsMarketplace(releaseId);
  const listingCount = await fetchDiscogsListingCount(releaseId);

  const normalized = normalizeReleaseForWantList(
    releaseId,
    release,
    marketplace,
    listingCount,
  );

  const intelligence = buildWantIntelligence(
    normalized.marketplace_for_sale_count,
    normalized.marketplace_lowest_price,
    normalized.notes,
  );

  const { error } = await supabase
    .from("want_list")
    .update({
      ...normalized,
      ...intelligence,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Could not refresh want list item: ${error.message}`);
  }

  revalidatePath("/collection/want-list");
}

export async function markWantListItemPurchased(formData: FormData) {
  const id = Number(formData.get("id"));

  if (!Number.isFinite(id)) {
    throw new Error("Missing want list item ID.");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be signed in.");
  }

  const { error } = await supabase
    .from("want_list")
    .update({
      purchased: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Could not mark item purchased: ${error.message}`);
  }

  revalidatePath("/collection/want-list");
}

export async function deleteWantListItem(formData: FormData) {
  const id = Number(formData.get("id"));

  if (!Number.isFinite(id)) {
    throw new Error("Missing want list item ID.");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be signed in.");
  }

  const { error } = await supabase
    .from("want_list")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Could not delete want list item: ${error.message}`);
  }

  revalidatePath("/collection/want-list");
}
