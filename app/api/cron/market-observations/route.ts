import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

const DISCOGS_API = "https://api.discogs.com";

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function signalType({
  forSale,
  lowestPrice,
  want,
  have,
}: {
  forSale: number | null;
  lowestPrice: number | null;
  want: number | null;
  have: number | null;
}) {
  if (forSale !== null && forSale <= 2 && want && want >= 50) {
    return "Rare Listing Event";
  }

  if (forSale !== null && forSale <= 5) {
    return "Supply Compression";
  }

  if (want && have && want > have) {
    return "Demand Outpaces Ownership";
  }

  if (lowestPrice !== null && lowestPrice >= 250) {
    return "High Value Market";
  }

  return "Active Market Watch";
}

async function searchDiscogsArtist(artist: string) {
  const params = new URLSearchParams({
    artist,
    type: "release",
    format: "Vinyl",
    per_page: "5",
    page: "1",
  });

  const response = await fetch(`${DISCOGS_API}/database/search?${params}`, {
    headers: getDiscogsHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const json = await response.json();
  return Array.isArray(json.results) ? json.results : [];
}

async function fetchRelease(releaseId: number) {
  const response = await fetch(`${DISCOGS_API}/releases/${releaseId}`, {
    headers: getDiscogsHeaders(),
    cache: "no-store",
  });

  if (!response.ok) return null;

  return response.json();
}

export async function GET() {
  const supabase = createAdminClient();

  const { data: favorites, error: favoritesError } = await supabase
    .from("favorite_artists")
    .select("artist_name")
    .eq("active", true)
    .order("artist_name", { ascending: true })
    .limit(8);

  if (favoritesError) {
    return NextResponse.json(
      { ok: false, error: favoritesError.message },
      { status: 500 },
    );
  }

  const observations = [];
  const results = [];

  for (const favorite of favorites || []) {
    const artistName = String(favorite.artist_name || "").trim();
    if (!artistName) continue;

    const searchResults = await searchDiscogsArtist(artistName);

    results.push({
      artist: artistName,
      candidates: searchResults.length,
    });

    await sleep(900);

    for (const result of searchResults.slice(0, 5)) {
      const releaseId = Number(result.id);
      if (!Number.isFinite(releaseId)) continue;

      const release = await fetchRelease(releaseId);

      await sleep(900);

      if (!release) continue;

      const forSale =
        typeof release.num_for_sale === "number"
          ? release.num_for_sale
          : null;

      const lowestPrice =
        typeof release.lowest_price === "number"
          ? release.lowest_price
          : null;

      const have =
        typeof release.community?.have === "number"
          ? release.community.have
          : null;

      const want =
        typeof release.community?.want === "number"
          ? release.community.want
          : null;

      observations.push({
        artist_name: artistName,
        release_title:
          release.title ||
          result.title ||
          null,
        discogs_release_id: releaseId,
        source: "discogs",
        marketplace_for_sale: forSale,
        lowest_price: lowestPrice,
        have_count: have,
        want_count: want,
        signal_type: signalType({
          forSale,
          lowestPrice,
          want,
          have,
        }),
      });
    }
  }

  if (observations.length > 0) {
    const { error: insertError } = await supabase
      .from("market_observations")
      .insert(observations);

    if (insertError) {
      return NextResponse.json(
        {
          ok: false,
          error: insertError.message,
          attempted: observations.length,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    job: "market-observations",
    favoritesChecked: favorites?.length || 0,
    observationsInserted: observations.length,
    results,
    timestamp: new Date().toISOString(),
  });
}
