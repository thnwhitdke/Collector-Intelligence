import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

export const dynamic = "force-dynamic";

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function dedupeKey(item: {
  id: number | string;
  title?: string | null;
  year?: number | null;
  country?: string | null;
}) {
  return [
    String(item.id),
    normalizeText(item.title).toLowerCase(),
    item.year ?? "",
    normalizeText(item.country).toLowerCase(),
  ].join("|");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = String(searchParams.get("q") || "").trim();

  if (!q) {
    return NextResponse.json({
      ok: true,
      results: [],
      warehouseResults: [],
      discogsResults: [],
    });
  }

  const supabase = createAdminClient();

  const warehousePromise = supabase
    .from("release_reference")
    .select(
      "source_release_id, artist, title, release_year, country, format, label, catalog_number, genres, styles, master_id",
    )
    .or(`artist.ilike.%${q}%,title.ilike.%${q}%,label.ilike.%${q}%,catalog_number.ilike.%${q}%`)
    .limit(20);

  const discogsPromise = (async () => {
    const params = new URLSearchParams({
      type: "release",
      q,
      per_page: "20",
    });

    const response = await fetch(
      `https://api.discogs.com/database/search?${params.toString()}`,
      {
        headers: {
          Authorization: `Discogs token=${process.env.DISCOGS_TOKEN}`,
          "User-Agent":
            process.env.DISCOGS_USER_AGENT || "CollectorIntelligence/1.0",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return {
        ok: false,
        error: `Discogs search failed: ${response.status}`,
        results: [],
      };
    }

    const json = await response.json();

    return {
      ok: true,
      results: (json.results || []).slice(0, 20).map((item: any) => ({
        id: item.id,
        source: "discogs_live",
        sourceLabel: "Discogs Live",
        title: item.title,
        year: item.year ?? null,
        country: item.country ?? null,
        label: Array.isArray(item.label)
          ? item.label.join(", ")
          : item.label ?? null,
        catno: item.catno ?? null,
        format: Array.isArray(item.format)
          ? item.format.join(", ")
          : item.format ?? null,
        thumb: item.thumb ?? null,
        uri: item.uri ?? null,
      })),
    };
  })();

  const [warehouseResponse, discogsResponse] = await Promise.all([
    warehousePromise,
    discogsPromise,
  ]);

  const warehouseResults = (warehouseResponse.data ?? []).map((item) => ({
    id: item.source_release_id,
    source: "ci_warehouse",
    sourceLabel: "CI Warehouse",
    title: [item.artist, item.title].filter(Boolean).join(" - "),
    artist: item.artist,
    releaseTitle: item.title,
    year: item.release_year ?? null,
    country: item.country ?? null,
    label: item.label ?? null,
    catno: item.catalog_number ?? null,
    format: item.format ?? null,
    genres: item.genres ?? [],
    styles: item.styles ?? [],
    master_id: item.master_id ?? null,
    thumb: null,
    uri: `/release/${item.source_release_id}`,
  }));

  const discogsResults = discogsResponse.results ?? [];

  const seen = new Set<string>();
  const results = [];

  for (const item of [...warehouseResults, ...discogsResults]) {
    const key = dedupeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(item);
  }

  return NextResponse.json({
    ok: true,
    results: results.slice(0, 40),
    warehouseResults,
    discogsResults,
    warehouseError: warehouseResponse.error?.message ?? null,
    discogsError: discogsResponse.ok ? null : discogsResponse.error,
  });
}
