"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";

function clean(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function containsMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

function confidenceLabel(score: number): string {
  if (score >= 85) return "High";
  if (score >= 65) return "Moderate";
  if (score >= 40) return "Developing";
  return "Low";
}

export async function matchSalesCompToRecords(normalizedSaleId: number) {
  const supabase = createAdminClient();

  const { data: comp, error } = await supabase
    .from("normalized_sales_comps")
    .select("*")
    .eq("id", normalizedSaleId)
    .single();

  if (error || !comp) {
    return {
      ok: false,
      error: error?.message ?? "Normalized comp not found",
    };
  }

  const artist = clean(comp.normalized_artist);
  const title = clean(comp.normalized_title);
  const label = clean(comp.normalized_label);
  const catalog = clean(comp.normalized_catalog_number);
  const country = clean(comp.normalized_country);
  const format = clean(comp.normalized_format);

  const { data: records, error: recordsError } = await supabase
    .from("records_clean_safe")
    .select(`
      id,
      user_id,
      artist,
      title,
      label,
      catalogue_number,
      country,
      format,
      year,
      discogs_release_id,
      media_condition,
      sleeve_condition
    `);

  if (recordsError) {
    return {
      ok: false,
      error: recordsError.message,
    };
  }

  const candidates = [];

  for (const record of records ?? []) {
    let score = 0;
    const signals: Array<{ signal: string; weight: number }> = [];

    const recordArtist = clean(record.artist);
    const recordTitle = clean(record.title);
    const recordLabel = clean(record.label);
    const recordCatalog = clean(record.catalogue_number);
    const recordCountry = clean(record.country);
    const recordFormat = clean(record.format);

    if (containsMatch(artist, recordArtist)) {
      score += 30;
      signals.push({ signal: "artist_similarity", weight: 30 });
    }

    if (containsMatch(title, recordTitle)) {
      score += 30;
      signals.push({ signal: "title_similarity", weight: 30 });
    }

    if (label && recordLabel && containsMatch(label, recordLabel)) {
      score += 10;
      signals.push({ signal: "label_similarity", weight: 10 });
    }

    if (catalog && recordCatalog && containsMatch(catalog, recordCatalog)) {
      score += 15;
      signals.push({ signal: "catalog_number_similarity", weight: 15 });
    }

    if (country && recordCountry && containsMatch(country, recordCountry)) {
      score += 5;
      signals.push({ signal: "country_similarity", weight: 5 });
    }

    if (format && recordFormat && containsMatch(format, recordFormat)) {
      score += 5;
      signals.push({ signal: "format_similarity", weight: 5 });
    }

    if (
      comp.normalized_year &&
      record.year &&
      Number(comp.normalized_year) === Number(record.year)
    ) {
      score += 15;
      signals.push({ signal: "year_match", weight: 15 });
    }

    if (score >= 55) {
      candidates.push({
        record,
        score,
        signals,
      });
    }
  }

  const rankedCandidates = candidates.sort(
    (a, b) => b.score - a.score || Number(a.record.id) - Number(b.record.id)
  );

  const candidateGroupKey = [
    comp.source_key,
    comp.normalized_artist,
    comp.normalized_title,
    comp.normalized_year,
    comp.sale_price,
    comp.sale_date,
  ]
    .filter(Boolean)
    .join("|");

  const results = [];

  for (let index = 0; index < rankedCandidates.length; index++) {
    const candidate = rankedCandidates[index];
    const label = confidenceLabel(candidate.score);

    await supabase.from("record_sales_matches").upsert(
      {
        record_id: candidate.record.id,
        user_id: candidate.record.user_id,
        normalized_sale_id: comp.id,
        match_score: candidate.score,
        match_confidence_label: label,
        match_reason: candidate.signals.map((signal) => signal.signal).join(", "),
        matched_by: "matching_engine_v3_pressing_aware",
        candidate_rank: index + 1,
        candidate_group_key: candidateGroupKey,
        match_signals: candidate.signals,
        is_best_candidate: index === 0,
      },
      {
        onConflict: "record_id,normalized_sale_id",
      }
    );

    results.push({
      recordId: candidate.record.id,
      rank: index + 1,
      score: candidate.score,
      label,
      isBestCandidate: index === 0,
      signals: candidate.signals,
    });
  }

  return {
    ok: true,
    matchesFound: results.length,
    results,
  };
}
