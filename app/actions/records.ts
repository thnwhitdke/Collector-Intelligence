"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../src/lib/supabase/server";
import {
  extractDiscogsReleaseIdFromUrl,
  fetchDiscogsReleaseCoverUrl,
} from "../../src/lib/discogs";

type DiscogsSearchApiResult = {
  id: number | string;
  title?: string | null;
  year?: number | string | null;
  country?: string | null;
  format?: string[] | null;
  label?: string[] | null;
  thumb?: string | null;
  uri?: string | null;
};

type ImportRecordRow = {
  artist?: string | null;
  title?: string | null;
  format?: string | null;
  label?: string | null;
  catalogue_number?: string | null;
  year_released?: string | null;
  country?: string | null;
  notes?: string | null;
  discogs_url?: string | null;
};

function normalizeEmpty(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeNumber(value: FormDataEntryValue | null) {
  const normalized = normalizeEmpty(value);
  if (normalized === null) return null;

  const numberValue = Number(normalized.replace(/[$,]/g, ""));
  return Number.isFinite(numberValue) ? numberValue : null;
}

function yesLike(value: string | null | undefined) {
  const v = (value ?? "").trim().toLowerCase();
  return v === "yes" || v === "y" || v === "true" || v === "1";
}

function hasCoverLike(record: {
  cover_url?: string | null;
  cover_present?: string | null;
}) {
  if (record.cover_url && String(record.cover_url).trim() !== "") return true;
  if (yesLike(record.cover_present)) return true;
  return false;
}

function addReviewTagToNotes(
  existingNotes: string | null | undefined,
  reason?: string | null
) {
  const cleanExisting = (existingNotes ?? "").trim();

  if (cleanExisting.includes("[REVIEW]")) {
    return cleanExisting;
  }

  const tagLine = reason?.trim()
    ? `[REVIEW] ${reason.trim()}`
    : "[REVIEW] Needs manual review";

  if (!cleanExisting) return tagLine;
  return `${tagLine}\n\n${cleanExisting}`;
}

function removeReviewTagFromNotes(existingNotes: string | null | undefined) {
  const cleanExisting = (existingNotes ?? "").trim();
  if (!cleanExisting) return null;

  const lines = cleanExisting
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => !line.trim().startsWith("[REVIEW]"));

  const rebuilt = lines.join("\n").trim();
  return rebuilt === "" ? null : rebuilt;
}

function numberOrZero(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

async function getAuthenticatedUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Not authenticated.");
  }

  return user.id;
}

async function tryBackfillCoverForRecord(
  id: number,
  discogsReleaseId: string | null,
  userId: string,
) {
  if (!discogsReleaseId) return;

  try {
    const coverUrl = await fetchDiscogsReleaseCoverUrl(discogsReleaseId);

    if (!coverUrl) return;

    const supabase = await createClient();

    const { error } = await supabase
      .from("records_clean_safe")
      .update({
        cover_url: coverUrl,
        discogs_release_id: discogsReleaseId,
        cover_present: "Yes",
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Cover backfill update failed:", error.message);
    }
  } catch (error) {
    console.error("Cover backfill failed:", error);
  }
}

export type CollectorGradingUpdate = {
  media_grade?: string | null;
  sleeve_grade?: string | null;
  grading_notes?: string | null;
  purchase_price?: number | null;
  current_value?: number | null;
  ebay_last_sold_price?: number | null;
  ebay_last_sold_date?: string | null;
  ebay_sold_comp_count?: number | null;
  ebay_low_sold_price?: number | null;
  ebay_median_sold_price?: number | null;
  ebay_high_sold_price?: number | null;
  ebay_notes?: string | null;
};

export type ValueDashboardSummary = {
  totalRecords: number;
  recordsWithEstimatedValue: number;
  totalEstimatedValue: number;
  averageEstimatedValue: number;
  totalDiscogsLow: number;
  totalDiscogsMedian: number;
  totalDiscogsHigh: number;
  lastValueUpdate: string | null;
};

export async function addRecord(formData: FormData) {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  const artist = normalizeEmpty(formData.get("artist"));
  const title = normalizeEmpty(formData.get("title"));
  const format = normalizeEmpty(formData.get("format"));
  const label = normalizeEmpty(formData.get("label"));
  const catalogue_number = normalizeEmpty(formData.get("catalogue_number"));
  const year_released = normalizeEmpty(formData.get("year_released"));
  const country = normalizeEmpty(formData.get("country"));
  const notes = normalizeEmpty(formData.get("notes"));
  const sealed_status = normalizeEmpty(formData.get("sealed_status"));
  const discogs_url = normalizeEmpty(formData.get("discogs_url"));

  const media_condition = normalizeEmpty(formData.get("media_condition"));
  const condition =
    media_condition ?? normalizeEmpty(formData.get("condition"));

  const price =
    normalizeEmpty(formData.get("price")) ??
    normalizeEmpty(formData.get("purchase_price"));

  const value =
    normalizeEmpty(formData.get("value")) ??
    normalizeEmpty(formData.get("estimated_value"));

  const date_acquired =
    normalizeEmpty(formData.get("date_acquired")) ??
    normalizeEmpty(formData.get("purchase_date"));

  const media_grade = normalizeEmpty(formData.get("media_grade"));
  const sleeve_grade = normalizeEmpty(formData.get("sleeve_grade"));
  const grading_notes = normalizeEmpty(formData.get("grading_notes"));
  const purchase_price = normalizeNumber(formData.get("purchase_price"));
  const current_value = normalizeNumber(formData.get("current_value"));
  const ebay_last_sold_price = normalizeNumber(
    formData.get("ebay_last_sold_price")
  );

  const ebay_last_sold_date = normalizeEmpty(
    formData.get("ebay_last_sold_date")
  );
  const ebay_sold_comp_count = normalizeNumber(
    formData.get("ebay_sold_comp_count")
  );
  const ebay_low_sold_price = normalizeNumber(
    formData.get("ebay_low_sold_price")
  );
  const ebay_median_sold_price = normalizeNumber(
    formData.get("ebay_median_sold_price")
  );
  const ebay_high_sold_price = normalizeNumber(
    formData.get("ebay_high_sold_price")
  );
  const ebay_notes = normalizeEmpty(formData.get("ebay_notes"));

  const discogs_release_id =
    normalizeEmpty(formData.get("discogs_release_id")) ??
    extractDiscogsReleaseIdFromUrl(discogs_url);

  const insertPayload = {
    user_id: userId,
    artist,
    title,
    format,
    label,
    catalogue_number,
    year_released,
    country,
    notes,
    sealed_status,
    discogs_url,
    discogs_release_id,
    condition,
    price,
    value,
    date_acquired,
    media_grade,
    sleeve_grade,
    grading_notes,
    purchase_price,
    current_value,
    ebay_last_sold_price,
    ebay_last_sold_date,
    ebay_sold_comp_count,
    ebay_low_sold_price,
    ebay_median_sold_price,
    ebay_high_sold_price,
    ebay_notes,
  };

  const { data, error } = await supabase
    .from("records_clean_safe")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to add record: ${error.message}`);
  }

  if (data?.id != null) {
    const recordId = Number(data.id);

    await tryBackfillCoverForRecord(recordId, discogs_release_id, userId);

  }

  revalidatePath("/collection");
}

export async function updateReleaseDetails(formData: FormData) {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  const idRaw = normalizeEmpty(formData.get("id"));
  if (!idRaw) {
    throw new Error("Missing record ID.");
  }

  const id = Number(idRaw);
  if (Number.isNaN(id)) {
    throw new Error("Invalid record ID.");
  }

  const artist = normalizeEmpty(formData.get("artist"));
  const title = normalizeEmpty(formData.get("title"));
  const format = normalizeEmpty(formData.get("format"));
  const label = normalizeEmpty(formData.get("label"));
  const catalogue_number = normalizeEmpty(formData.get("catalogue_number"));
  const year_released = normalizeEmpty(formData.get("year_released"));
  const country = normalizeEmpty(formData.get("country"));
  const notes = normalizeEmpty(formData.get("notes"));
  const sealed_status = normalizeEmpty(formData.get("sealed_status"));
  const discogs_url = normalizeEmpty(formData.get("discogs_url"));

  const discogs_release_id =
    normalizeEmpty(formData.get("discogs_release_id")) ??
    extractDiscogsReleaseIdFromUrl(discogs_url);

  const discogs_master_id = normalizeEmpty(formData.get("discogs_master_id"));
  const discogs_sale_blocked = formData.get("discogs_sale_blocked") === "on";
  const discogs_sale_blocked_reason = normalizeEmpty(
    formData.get("discogs_sale_blocked_reason")
  );

  const { error } = await supabase
    .from("records_clean_safe")
    .update({
      artist,
      title,
      format,
      label,
      catalogue_number,
      year_released,
      country,
      notes,
      sealed_status,
      discogs_url,
      discogs_release_id,
      discogs_master_id,
      discogs_sale_blocked,
      discogs_sale_blocked_reason,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to update release details: ${error.message}`);
  }

  if (discogs_release_id) {
    await tryBackfillCoverForRecord(id, discogs_release_id, userId);
  }

  revalidatePath("/collection");
  revalidatePath(`/collection/${id}`);
}

export async function updateCollectorDetails(formData: FormData) {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  const idRaw = normalizeEmpty(formData.get("id"));
  if (!idRaw) {
    throw new Error("Missing record ID.");
  }

  const id = Number(idRaw);
  if (Number.isNaN(id)) {
    throw new Error("Invalid record ID.");
  }

  const condition =
    normalizeEmpty(formData.get("media_condition")) ??
    normalizeEmpty(formData.get("condition"));

  const price =
    normalizeEmpty(formData.get("price")) ??
    normalizeEmpty(formData.get("purchase_price"));

  const value =
    normalizeEmpty(formData.get("value")) ??
    normalizeEmpty(formData.get("estimated_value"));

  const date_acquired =
    normalizeEmpty(formData.get("date_acquired")) ??
    normalizeEmpty(formData.get("purchase_date"));

  const media_grade = normalizeEmpty(formData.get("media_grade"));
  const sleeve_grade = normalizeEmpty(formData.get("sleeve_grade"));
  const grading_notes = normalizeEmpty(formData.get("grading_notes"));
  const purchase_price = normalizeNumber(formData.get("purchase_price"));
  const current_value = normalizeNumber(formData.get("current_value"));

  const ebay_last_sold_price = normalizeNumber(
    formData.get("ebay_last_sold_price")
  );
  const ebay_last_sold_date = normalizeEmpty(
    formData.get("ebay_last_sold_date")
  );
  const ebay_sold_comp_count = normalizeNumber(
    formData.get("ebay_sold_comp_count")
  );
  const ebay_low_sold_price = normalizeNumber(
    formData.get("ebay_low_sold_price")
  );
  const ebay_median_sold_price = normalizeNumber(
    formData.get("ebay_median_sold_price")
  );
  const ebay_high_sold_price = normalizeNumber(
    formData.get("ebay_high_sold_price")
  );
  const ebay_notes = normalizeEmpty(formData.get("ebay_notes"));

  const { error } = await supabase
    .from("records_clean_safe")
    .update({
      condition,
      price,
      value,
      date_acquired,
      media_grade,
      sleeve_grade,
      grading_notes,
      purchase_price,
      current_value,
      ebay_last_sold_price,
      ebay_last_sold_date,
      ebay_sold_comp_count,
      ebay_low_sold_price,
      ebay_median_sold_price,
      ebay_high_sold_price,
      ebay_notes,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to update collector details: ${error.message}`);
  }

  revalidatePath("/collection");
  revalidatePath(`/collection/${id}`);
}

export async function updateCollectorGrading(
  recordId: number,
  values: CollectorGradingUpdate
) {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  if (!recordId || Number.isNaN(recordId)) {
    throw new Error("Invalid record ID.");
  }

  const cleanedValues = {
    media_grade: values.media_grade || null,
    sleeve_grade: values.sleeve_grade || null,
    grading_notes: values.grading_notes || null,
    purchase_price:
      values.purchase_price === undefined || values.purchase_price === null
        ? null
        : Number(values.purchase_price),
    current_value:
      values.current_value === undefined || values.current_value === null
        ? null
        : Number(values.current_value),
    ebay_last_sold_price:
      values.ebay_last_sold_price === undefined ||
      values.ebay_last_sold_price === null
        ? null
        : Number(values.ebay_last_sold_price),
    ebay_last_sold_date: values.ebay_last_sold_date || null,
    ebay_sold_comp_count:
      values.ebay_sold_comp_count === undefined ||
      values.ebay_sold_comp_count === null
        ? null
        : Number(values.ebay_sold_comp_count),
    ebay_low_sold_price:
      values.ebay_low_sold_price === undefined ||
      values.ebay_low_sold_price === null
        ? null
        : Number(values.ebay_low_sold_price),
    ebay_median_sold_price:
      values.ebay_median_sold_price === undefined ||
      values.ebay_median_sold_price === null
        ? null
        : Number(values.ebay_median_sold_price),
    ebay_high_sold_price:
      values.ebay_high_sold_price === undefined ||
      values.ebay_high_sold_price === null
        ? null
        : Number(values.ebay_high_sold_price),
    ebay_notes: values.ebay_notes || null,
  };

  const { error } = await supabase
    .from("records_clean_safe")
    .update(cleanedValues)
    .eq("id", recordId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to update grading fields: ${error.message}`);
  }

  revalidatePath("/collection");
  revalidatePath(`/collection/${recordId}`);

  return { success: true };
}

export async function getValueDashboardSummary(): Promise<ValueDashboardSummary> {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  const { data, error } = await supabase
    .from("records_clean_safe")
    .select(
      `
      id,
      discogs_low_price,
      discogs_median_price,
      discogs_high_price,
      estimated_value,
      current_value,
      value_last_updated
    `
    )
    .eq("user_id", userId);

  if (error) {
    console.error("Error loading value dashboard summary:", error.message);

    return {
      totalRecords: 0,
      recordsWithEstimatedValue: 0,
      totalEstimatedValue: 0,
      averageEstimatedValue: 0,
      totalDiscogsLow: 0,
      totalDiscogsMedian: 0,
      totalDiscogsHigh: 0,
      lastValueUpdate: null,
    };
  }

  const rows = data ?? [];

  const totalRecords = rows.length;

  const recordsWithEstimatedValue = rows.filter((row) => {
    return (
      numberOrZero(row.estimated_value) > 0 ||
      numberOrZero(row.current_value) > 0
    );
  }).length;

  const totalEstimatedValue = rows.reduce((sum, row) => {
    const estimated = numberOrZero(row.estimated_value);
    const current = numberOrZero(row.current_value);

    return sum + (estimated > 0 ? estimated : current);
  }, 0);

  const totalDiscogsLow = rows.reduce(
    (sum, row) => sum + numberOrZero(row.discogs_low_price),
    0
  );

  const totalDiscogsMedian = rows.reduce(
    (sum, row) => sum + numberOrZero(row.discogs_median_price),
    0
  );

  const totalDiscogsHigh = rows.reduce(
    (sum, row) => sum + numberOrZero(row.discogs_high_price),
    0
  );

  const averageEstimatedValue =
    recordsWithEstimatedValue > 0
      ? totalEstimatedValue / recordsWithEstimatedValue
      : 0;

  const lastValueUpdate =
    rows
      .map((row) => row.value_last_updated)
      .filter(Boolean)
      .sort()
      .reverse()[0] ?? null;

  return {
    totalRecords,
    recordsWithEstimatedValue,
    totalEstimatedValue,
    averageEstimatedValue,
    totalDiscogsLow,
    totalDiscogsMedian,
    totalDiscogsHigh,
    lastValueUpdate,
  };
}

export async function refreshCoverFromDiscogs(formData: FormData) {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  const idRaw = normalizeEmpty(formData.get("id"));
  if (!idRaw) {
    throw new Error("Missing record ID.");
  }

  const id = Number(idRaw);
  if (Number.isNaN(id)) {
    throw new Error("Invalid record ID.");
  }

  const { data: record, error: readError } = await supabase
    .from("records_clean_safe")
    .select("id, discogs_release_id, discogs_url, cover_url")
    .eq("id", id)
    .single();

  if (readError || !record) {
    throw new Error("Could not load record for cover refresh.");
  }

  const releaseId =
    record.discogs_release_id ||
    extractDiscogsReleaseIdFromUrl(record.discogs_url);

  if (!releaseId) {
    throw new Error("No Discogs release ID is available for this record.");
  }

  const coverUrl = await fetchDiscogsReleaseCoverUrl(String(releaseId));

  if (!coverUrl) {
    throw new Error("Discogs returned no cover image for this release.");
  }

  const { error: updateError } = await supabase
    .from("records_clean_safe")
    .update({
      cover_url: coverUrl,
      discogs_release_id: String(releaseId),
      cover_present: "Yes",
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(`Failed to save cover URL: ${updateError.message}`);
  }

  revalidatePath("/collection");
  revalidatePath(`/collection/${id}`);
}

export async function fixCover(recordId: number, discogsReleaseId: string) {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  if (!discogsReleaseId) {
    throw new Error("Missing Discogs Release ID");
  }

  const res = await fetch(
    `https://api.discogs.com/releases/${discogsReleaseId}`,
    {
      headers: {
        Authorization: `Discogs token=${process.env.DISCOGS_TOKEN}`,
        "User-Agent": process.env.DISCOGS_USER_AGENT || "CollectorApp/1.0",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch Discogs data: ${res.status}`);
  }

  const data = await res.json();
  const imageUrl =
    data.images?.[0]?.uri || null

   const thumbnailUrl = 
    data.images?.[0]?.uri150 || null

  const coverUrl = data?.images?.[0]?.uri || data?.images?.[0]?.resource_url;

  if (!coverUrl) {
    throw new Error("No cover found");
  }

  const { error } = await supabase
    .from("records_clean_safe")
 .update({
    cover_url: coverUrl,
    cover_present: "Yes",
    discogs_release_id: discogsReleaseId,

  discogs_image_url: imageUrl,
  discogs_thumbnail_url: thumbnailUrl,
})
    .eq("id", recordId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to save cover: ${error.message}`);
  }

  revalidatePath("/collection");
  revalidatePath(`/collection/${recordId}`);

  return { success: true };
}

export async function bulkFixMissingCovers(limit = 25) {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 25;

  const { data: candidates, error: readError } = await supabase
    .from("records_clean_safe")
    .select("id, cover_url, cover_present, discogs_release_id, discogs_url")
    .eq("user_id", userId)
    .limit(500);

  if (readError) {
    throw new Error(`Failed to load records for bulk fix: ${readError.message}`);
  }

  const missingCoverRecords = (candidates ?? []).filter((record) => {
    return !hasCoverLike(record);
  });

  const actionable = missingCoverRecords.filter((record) => {
    const releaseId =
      record.discogs_release_id ||
      extractDiscogsReleaseIdFromUrl(record.discogs_url);
    return !!releaseId && String(releaseId).trim() !== "";
  });

  const batch = actionable.slice(0, safeLimit);

  let fixed = 0;
  let skipped = 0;
  let failed = 0;

  skipped += missingCoverRecords.length - actionable.length;

  for (const record of batch) {
    const releaseId =
      record.discogs_release_id ||
      extractDiscogsReleaseIdFromUrl(record.discogs_url);

    if (!releaseId) {
      skipped += 1;
      continue;
    }

    try {
      const coverUrl = await fetchDiscogsReleaseCoverUrl(String(releaseId));

      if (!coverUrl) {
        failed += 1;
        continue;
      }

      const { error: updateError } = await supabase
        .from("records_clean_safe")
        .update({
            cover_url: coverUrl,
            cover_present: "Yes",
            discogs_release_id: String(releaseId),

            discogs_image_url: coverUrl,
            discogs_thumbnail_url: coverUrl,
})
        .eq("id", record.id);

      if (updateError) {
        failed += 1;
        continue;
      }

      fixed += 1;
    } catch (error) {
      console.error(`Bulk cover fix failed for record ${record.id}:`, error);
      failed += 1;
    }
  }

  revalidatePath("/collection");

  return {
    success: true,
    processed: batch.length,
    fixed,
    skipped,
    failed,
    remainingActionable: Math.max(actionable.length - batch.length, 0),
  };
}

export type DiscogsMatchResult = {
  id: string;
  title: string;
  year: string | null;
  country: string | null;
  format: string | null;
  label: string | null;
  thumb: string | null;
  uri: string | null;
};

export async function searchDiscogsMatches(
  query: string,
  limit = 5
): Promise<DiscogsMatchResult[]> {
  const trimmed = query.trim();

  if (!trimmed) {
    throw new Error("Search query is empty.");
  }

  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 10) : 5;

  const url = new URL("https://api.discogs.com/database/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("type", "release");
  url.searchParams.set("per_page", String(safeLimit));
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Discogs token=${process.env.DISCOGS_TOKEN}`,
      "User-Agent": process.env.DISCOGS_USER_AGENT || "CollectorApp/1.0",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Discogs search failed: ${res.status}`);
  }

  const data: { results?: DiscogsSearchApiResult[] } = await res.json();
  const results = Array.isArray(data.results) ? data.results : [];

  return results.map((item: DiscogsSearchApiResult) => ({
    id: String(item.id),
    title: item.title ? String(item.title) : "Untitled",
    year: item.year ? String(item.year) : null,
    country: item.country ? String(item.country) : null,
    format: Array.isArray(item.format) ? item.format.join(", ") : null,
    label: Array.isArray(item.label) ? item.label.join(", ") : null,
    thumb: item.thumb ? String(item.thumb) : null,
    uri: item.uri ? `https://www.discogs.com${item.uri}` : null,
  }));
}

export async function saveDiscogsMatch(
  recordId: number,
  discogsReleaseId: string,
  discogsUrl?: string | null
) {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  if (!recordId || Number.isNaN(recordId)) {
    throw new Error("Invalid record ID.");
  }

  if (!discogsReleaseId || !String(discogsReleaseId).trim()) {
    throw new Error("Missing Discogs release ID.");
  }

  const updatePayload: {
    discogs_release_id: string;
    discogs_url?: string | null;
  } = {
    discogs_release_id: String(discogsReleaseId),
  };

  if (discogsUrl !== undefined) {
    updatePayload.discogs_url = discogsUrl;
  }

  const { error } = await supabase
    .from("records_clean_safe")
    .update(updatePayload)
    .eq("id", recordId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to save Discogs match: ${error.message}`);
  }

  await tryBackfillCoverForRecord(recordId, String(discogsReleaseId), userId);

  revalidatePath("/collection");
  revalidatePath(`/collection/${recordId}`);

  return { success: true };
}

export async function setReviewFlag(
  recordId: number,
  reason?: string | null
) {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  const { data: record, error: readError } = await supabase
    .from("records_clean_safe")
    .select("id, notes")
    .eq("id", recordId)
    .single();

  if (readError || !record) {
    throw new Error("Could not load record for review flag.");
  }

  const nextNotes = addReviewTagToNotes(record.notes, reason);

  const { error: updateError } = await supabase
    .from("records_clean_safe")
    .update({ notes: nextNotes })
    .eq("id", recordId)
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(`Failed to mark record for review: ${updateError.message}`);
  }

  revalidatePath("/collection");
  revalidatePath(`/collection/${recordId}`);

  return { success: true };
}

export async function clearReviewFlag(recordId: number) {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  const { data: record, error: readError } = await supabase
    .from("records_clean_safe")
    .select("id, notes")
    .eq("id", recordId)
    .single();

  if (readError || !record) {
    throw new Error("Could not load record for clearing review flag.");
  }

  const nextNotes = removeReviewTagFromNotes(record.notes);

  const { error: updateError } = await supabase
    .from("records_clean_safe")
    .update({ notes: nextNotes })
    .eq("id", recordId)
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(`Failed to clear review flag: ${updateError.message}`);
  }

  revalidatePath("/collection");
  revalidatePath(`/collection/${recordId}`);

  return { success: true };
}

export type SavedViewRow = {
  id: number;
  name: string;
  preset: string;
  sort: string;
  search_query: string;
  created_at: string;
};

export async function getSavedViews(): Promise<SavedViewRow[]> {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  const { data, error } = await supabase
    .from("saved_views")
    .select("id, name, preset, sort, search_query, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getSavedViews error:", error.message);
    throw new Error("Failed to load saved views.");
  }

  return (data ?? []) as SavedViewRow[];
}

export async function createSavedView(input: {
  name: string;
  preset: string;
  sort: string;
  searchQuery: string;
}): Promise<{ success: true }> {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  const name = input.name.trim();
  const preset = input.preset.trim() || "all";
  const sort = input.sort.trim() || "id_desc";
  const searchQuery = input.searchQuery.trim();

  if (!name) {
    throw new Error("Saved view name is required.");
  }

  const { error } = await supabase.from("saved_views").insert({
    user_id: userId,
    name,
    preset,
    sort,
    search_query: searchQuery,
  });

  if (error) {
    console.error("createSavedView error:", error.message);
    throw new Error("Failed to save view.");
  }

  revalidatePath("/collection");

  return { success: true };
}

export async function importRecords(rows: ImportRecordRow[]) {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  const cleaned = rows
    .filter((row) => row.artist && row.title)
    .map((row) => ({
      user_id: userId,
      artist: row.artist?.trim() || null,
      title: row.title?.trim() || null,
      format: row.format?.trim() || null,
      label: row.label?.trim() || null,
      catalogue_number: row.catalogue_number?.trim() || null,
      year_released: row.year_released?.trim() || null,
      country: row.country?.trim() || null,
      notes: row.notes?.trim() || null,
      discogs_url: row.discogs_url?.trim() || null,
      cover_present: "No",
      cover_url: null,
    }));

  if (cleaned.length === 0) {
    throw new Error("No valid rows to import.");
  }

  const { error } = await supabase.from("records_clean_safe").insert(cleaned);

  if (error) {
    console.error("Import records failed:", error);
    throw new Error(error.message);
  }

  return {
    inserted: cleaned.length,
    skipped: rows.length - cleaned.length,
  };
}


export async function duplicateRecord(formData: FormData) {
  const id = Number(formData.get("id"));

  if (!id) return;

  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  const { data, error } = await supabase
    .from("records_clean_safe")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Record not found or not authorized.");
  }

  const duplicate = { ...data };

  delete duplicate.id;
  delete duplicate.created_at;
  delete duplicate.updated_at;

  duplicate.user_id = userId;
  duplicate.title = data.title ? `${data.title} (Copy)` : "Duplicated Record";

  const { data: inserted, error: insertError } = await supabase
    .from("records_clean_safe")
    .insert(duplicate)
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message || "Could not duplicate record.");
  }

  revalidatePath("/collection");
  redirect(`/collection/${inserted.id}`);
}

export async function deleteRecord(formData: FormData) {
  const id = Number(formData.get("id"));

  if (!id) return;

  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  const { error } = await supabase
    .from("records_clean_safe")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/collection");
  redirect("/collection");
}
