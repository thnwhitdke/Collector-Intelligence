"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned.length ? cleaned : null;
}

function confidenceLabel(score: number): string {
  if (score >= 85) return "High";
  if (score >= 65) return "Moderate";
  if (score >= 40) return "Developing";
  return "Low";
}

function normalizeYear(value: unknown): number | null {
  const year = Number(value);

  if (
    Number.isFinite(year) &&
    year >= 1900 &&
    year <= 2100
  ) {
    return year;
  }

  return null;
}

export async function normalizeSalesObservation(
  rawObservationId: number
) {
  const supabase = createAdminClient();

  const { data: raw, error } = await supabase
    .from("raw_sales_observations")
    .select("*")
    .eq("id", rawObservationId)
    .single();

  if (error || !raw) {
    return {
      ok: false,
      error:
        error?.message ??
        "Raw observation not found",
    };
  }

  const normalizedArtist =
    cleanText(raw.raw_artist);

  const normalizedTitle =
    cleanText(raw.raw_title);

  const normalizedLabel =
    cleanText(raw.raw_label);

  const normalizedCatalog =
    cleanText(raw.raw_catalog_number);

  const normalizedFormat =
    cleanText(raw.raw_format);

  const normalizedCountry =
    cleanText(raw.raw_country);

  const normalizedYear =
    normalizeYear(raw.raw_year);

  let score = 0;

  if (normalizedArtist) score += 30;
  if (normalizedTitle) score += 30;
  if (normalizedLabel) score += 10;
  if (normalizedYear) score += 10;
  if (raw.sale_price) score += 10;
  if (raw.sale_date) score += 10;

  const label = confidenceLabel(score);

  const { data: comp, error: insertError } =
    await supabase
      .from("normalized_sales_comps")
      .insert({
        raw_observation_id: raw.id,
        normalized_artist:
          normalizedArtist,
        normalized_title:
          normalizedTitle,
        normalized_label:
          normalizedLabel,
        normalized_catalog_number:
          normalizedCatalog,
        normalized_format:
          normalizedFormat,
        normalized_country:
          normalizedCountry,
        normalized_year:
          normalizedYear,
        sale_price: raw.sale_price,
        sale_currency:
          raw.sale_currency,
        sale_date: raw.sale_date,
        source_key:
          raw.source_key,
        external_url:
          raw.external_url,
        normalized_confidence_score:
          score,
        normalized_confidence_label:
          label,
      })
      .select("id")
      .single();

  if (insertError) {
    return {
      ok: false,
      error:
        insertError.message,
    };
  }

  await supabase
    .from("raw_sales_observations")
    .update({
      normalization_status:
        "normalized",
    })
    .eq("id", raw.id);

  return {
    ok: true,
    normalizedCompId:
      comp.id,
    confidenceScore:
      score,
    confidenceLabel:
      label,
  };
}
