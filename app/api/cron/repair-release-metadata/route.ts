import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

const DISCOGS_API = "https://api.discogs.com";

type RecordRow = {
  id: number;
  artist: string | null;
  title: string | null;
  label: string | null;
  catalogue_number: string | null;
  country: string | null;
  year: number | null;
  year_released: string | null;
  discogs_release_id: string | number | null;
  enrichment_status: string | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function primaryImage(images: any[] | undefined) {
  if (!Array.isArray(images) || images.length === 0) {
    return {
      image: null,
      thumbnail: null,
    };
  }

  const primary =
    images.find((image) => image?.type === "primary") ||
    images[0];

  return {
    image: primary?.uri || primary?.resource_url || null,
    thumbnail: primary?.uri150 || null,
  };
}

function formatText(formats: any[] | undefined) {
  if (!Array.isArray(formats) || formats.length === 0) return null;

  return formats
    .map((format) => {
      const name = normalizeText(format?.name);
      const descriptions = Array.isArray(format?.descriptions)
        ? format.descriptions.map(normalizeText).filter(Boolean).join(", ")
        : "";

      return [name, descriptions].filter(Boolean).join(" — ");
    })
    .filter(Boolean)
    .join(" / ");
}

async function fetchDiscogsRelease(releaseId: string) {
  const token = process.env.DISCOGS_TOKEN;
  const userAgent =
    process.env.DISCOGS_USER_AGENT || "CollectorIntelligence/1.0";

  if (!token) {
    return {
      ok: false,
      status: 0,
      error: "Missing DISCOGS_TOKEN",
      data: null,
    };
  }

  const response = await fetch(`${DISCOGS_API}/releases/${releaseId}`, {
    headers: {
      Authorization: `Discogs token=${token}`,
      "User-Agent": userAgent,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: `Discogs HTTP ${response.status}`,
      data: null,
    };
  }

  return {
    ok: true,
    status: response.status,
    error: null,
    data: await response.json(),
  };
}

export async function GET(request: Request) {
  const supabase = createAdminClient();
  const url = new URL(request.url);

  const limitParam = Number(url.searchParams.get("limit") || 25);
  const limit = Math.max(1, Math.min(limitParam, 50));

  const { data: records, error } = await supabase
    .from("records_clean_safe")
    .select(`
      id,
      artist,
      title,
      label,
      catalogue_number,
      country,
      year,
      year_released,
      discogs_release_id,
      enrichment_status
    `)
    .not("discogs_release_id", "is", null)
    .neq("enrichment_status", "release_metadata_repaired")
    .order("id", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        job: "repair-release-metadata",
        error: error.message,
      },
      { status: 500 },
    );
  }

  let checked = 0;
  let updated = 0;
  let skipped = 0;
  let stoppedEarly = false;

  const results = [];

  for (const record of (records || []) as RecordRow[]) {
    checked++;

    const releaseId = normalizeText(record.discogs_release_id);

    if (!releaseId) {
      skipped++;
      continue;
    }

    const result = await fetchDiscogsRelease(releaseId);

    if (!result.ok || !result.data) {
      skipped++;

      results.push({
        id: record.id,
        ok: false,
        releaseId,
        reason: result.error,
      });

      if (result.status === 429) {
        stoppedEarly = true;
        break;
      }

      continue;
    }

    const release = result.data;

    const firstLabel = Array.isArray(release.labels)
      ? release.labels[0]
      : null;

    const images = primaryImage(release.images);

    const nextLabel =
      normalizeText(firstLabel?.name) || record.label || null;

    const nextCatalogueNumber =
      normalizeText(firstLabel?.catno) || record.catalogue_number || null;

    const nextCountry =
      normalizeText(release.country) || record.country || null;

    const nextYear =
      Number.isFinite(Number(release.year)) && Number(release.year) > 0
        ? Number(release.year)
        : record.year ?? null;

    const nextYearReleased =
      nextYear ? String(nextYear) : record.year_released;

    const nextFormat =
      formatText(release.formats);

    const updatePayload: Record<string, unknown> = {
      label: nextLabel,
      catalogue_number: nextCatalogueNumber,
      country: nextCountry,
      year: nextYear,
      year_released: nextYearReleased,
      enrichment_status: "release_metadata_repaired",
      value_pull_note: `Release metadata repaired from Discogs release ${releaseId}.`,
      value_pull_last_attempted_at: new Date().toISOString(),
    };

    if (nextFormat) {
      updatePayload.format = nextFormat;
    }

    if (images.image) {
      updatePayload.discogs_image_url = images.image;
    }

    if (images.thumbnail) {
      updatePayload.discogs_thumbnail_url = images.thumbnail;
    }

    if (!record.title && release.title) {
      updatePayload.title = release.title;
    }

    const { error: updateError } = await supabase
      .from("records_clean_safe")
      .update(updatePayload)
      .eq("id", record.id);

    if (updateError) {
      skipped++;

      results.push({
        id: record.id,
        ok: false,
        releaseId,
        reason: updateError.message,
      });

      continue;
    }

    updated++;

    results.push({
      id: record.id,
      ok: true,
      releaseId,
      label: nextLabel,
      catalogue_number: nextCatalogueNumber,
      country: nextCountry,
      year: nextYear,
    });

    await sleep(900);
  }

  return NextResponse.json({
    ok: true,
    job: "repair-release-metadata",
    timestamp: new Date().toISOString(),
    checked,
    updated,
    skipped,
    stoppedEarly,
    results,
  });
}
