import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

type SearchMode = "artist" | "release" | "catalog" | "discogs";

function clean(value: string) {
  return value
    .replace(/[%_,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

function words(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2);
}

function searchableText(row: Record<string, unknown>) {
  return [
    row.artist,
    row.title,
    row.country,
    row.label,
    row.catalog_number,
    row.format,
    row.release_year,
    row.source_release_id,
    row.master_id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesEveryTerm(row: Record<string, unknown>, searchTerms: string[]) {
  const haystack = searchableText(row);
  return searchTerms.every((term) => haystack.includes(term));
}

export async function GET(request: NextRequest) {
  const userSupabase = await createClient();

  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = clean(request.nextUrl.searchParams.get("q") || "");
  const requestedMode = request.nextUrl.searchParams.get("mode") || "artist";

  const mode: SearchMode = ["artist", "release", "catalog", "discogs"].includes(
    requestedMode,
  )
    ? (requestedMode as SearchMode)
    : "artist";

  if (!q) {
    return NextResponse.json({
      query: "",
      mode,
      results: [],
      loadedCount: 0,
      ownedCount: 0,
      missingCount: 0,
      warehouseSource: "release_reference",
    });
  }

  const admin = createAdminClient();
  const searchTerms = words(q);

  let warehouseQuery = admin
    .from("release_reference")
    .select(`
      id,
      source,
      source_release_id,
      artist,
      title,
      release_year,
      country,
      format,
      label,
      catalog_number,
      genres,
      styles,
      master_id,
      intelligence_status
    `);

  if (mode === "artist") {
    /*
     * Artist Catalog mode intentionally searches the complete artist field.
     * "Kevin Ayers" therefore returns Kevin Ayers, Kevin Ayers And The Whole
     * World, and other artist-name variants containing the requested name.
     */
    warehouseQuery = warehouseQuery
      .ilike("artist", `%${q}%`)
      .order("release_year", { ascending: true, nullsFirst: false })
      .limit(1500);
  } else if (mode === "catalog") {
    warehouseQuery = warehouseQuery
      .ilike("catalog_number", `%${q}%`)
      .order("release_year", { ascending: true, nullsFirst: false })
      .limit(750);
  } else if (mode === "discogs") {
    const numericId = Number(q);

    if (!Number.isFinite(numericId)) {
      return NextResponse.json({
        error: "Discogs Release ID must be numeric.",
      }, { status: 400 });
    }

    warehouseQuery = warehouseQuery
      .eq("source_release_id", numericId)
      .limit(20);
  } else {
    /*
     * Release / Variant mode starts with the longest useful search term to
     * keep the six-million-row warehouse query indexed and fast. The full
     * term set is applied below after the candidate rows return.
     */
    const strongestTerm =
      [...searchTerms].sort((a, b) => b.length - a.length)[0] || q;

    warehouseQuery = warehouseQuery
      .or(
        [
          `artist.ilike.%${strongestTerm}%`,
          `title.ilike.%${strongestTerm}%`,
          `label.ilike.%${strongestTerm}%`,
          `catalog_number.ilike.%${strongestTerm}%`,
        ].join(","),
      )
      .order("release_year", { ascending: true, nullsFirst: false })
      .limit(2000);
  }

  const { data: warehouseRows, error: warehouseError } =
    await warehouseQuery;

  if (warehouseError) {
    return NextResponse.json(
      { error: warehouseError.message },
      { status: 500 },
    );
  }

  const candidates = warehouseRows || [];

  const filtered =
    mode === "release"
      ? candidates.filter((row) => matchesEveryTerm(row, searchTerms))
      : candidates;

  const limited = filtered.slice(0, 1500);

  const discogsIds = limited
    .map((row) => String(row.source_release_id || "").trim())
    .filter(Boolean);

  const { data: ownedRows, error: ownedError } = discogsIds.length
    ? await userSupabase
        .from("records_clean_safe")
        .select(`
          id,
          discogs_release_id,
          artist,
          title,
          country,
          label,
          catalogue_number,
          format,
          year_released,
          cover_url
        `)
        .eq("user_id", user.id)
        .in("discogs_release_id", discogsIds)
    : { data: [], error: null };

  if (ownedError) {
    return NextResponse.json(
      { error: ownedError.message },
      { status: 500 },
    );
  }

  const ownedByDiscogs = new Map(
    (ownedRows || []).map((row) => [
      String(row.discogs_release_id || ""),
      row,
    ]),
  );

  const { data: actionRows } = discogsIds.length
    ? await userSupabase
        .from("user_release_actions")
        .select("source_release_id, action_type")
        .eq("user_id", user.id)
        .in("source_release_id", discogsIds)
    : { data: [] as any[] };

  const actionsByRelease = new Map<string, Set<string>>();

  for (const action of actionRows || []) {
    const releaseId = String(action.source_release_id || "");
    const current = actionsByRelease.get(releaseId) || new Set<string>();
    current.add(String(action.action_type));
    actionsByRelease.set(releaseId, current);
  }

  const results = limited.map((row) => {
    const releaseId = String(row.source_release_id || "");
    const owned = ownedByDiscogs.get(releaseId);
    const actions = actionsByRelease.get(releaseId) || new Set<string>();

    return {
      id: String(row.id),
      warehouse_source: "Discogs Warehouse",
      canonical_artist: row.artist,
      raw_artist: row.artist,
      title: row.title,
      country: row.country,
      label: row.label,
      catalog_number: row.catalog_number,
      format: row.format,
      release_year: row.release_year,
      discogs_release_id: row.source_release_id,
      discogs_master_id: row.master_id,
      genres: row.genres,
      styles: row.styles,
      variant_signature: [
        row.title,
        row.country,
        row.label,
        row.catalog_number,
        row.format,
        row.release_year,
      ]
        .filter(Boolean)
        .join(" | "),
      intelligence_status: row.intelligence_status || "warehouse",
      owned: Boolean(owned),
      owned_record_id: owned?.id || null,
      owned_cover_url: owned?.cover_url || null,
      in_want_list: actions.has("want"),
      reviewed: actions.has("reviewed"),
      ignored: actions.has("ignored"),
    };
  });

  return NextResponse.json({
    query: q,
    mode,
    warehouseSource: "release_reference",
    loadedCount: results.length,
    ownedCount: results.filter((row) => row.owned).length,
    missingCount: results.filter((row) => !row.owned).length,
    results,
  });
}
