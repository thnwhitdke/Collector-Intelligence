"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";

function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function confidenceLabel(score: number): string {
  if (score >= 85) return "High";
  if (score >= 65) return "Moderate";
  if (score >= 40) return "Developing";
  return "Low";
}

export async function matchSalesCompToRecords(
  normalizedSaleId: number
) {
  const supabase = createAdminClient();

  const { data: comp, error } =
    await supabase
      .from("normalized_sales_comps")
      .select("*")
      .eq("id", normalizedSaleId)
      .single();

  if (error || !comp) {
    return {
      ok: false,
      error:
        error?.message ??
        "Normalized comp not found",
    };
  }

  const artist =
    clean(comp.normalized_artist);

  const title =
    clean(comp.normalized_title);

  const { data: records, error: recordsError } =
    await supabase
      .from("records_clean_safe")
      .select(
        "id,user_id,artist,title,label,year"
      );

  if (recordsError) {
    return {
      ok: false,
      error:
        recordsError.message,
    };
  }

  const results = [];

  for (const record of records ?? []) {
    let score = 0;
    const reasons = [];

    const recordArtist =
      clean(record.artist);

    const recordTitle =
      clean(record.title);

    if (
      artist &&
      recordArtist &&
      artist === recordArtist
    ) {
      score += 40;
      reasons.push(
        "Artist match"
      );
    }

    if (
      title &&
      recordTitle &&
      title === recordTitle
    ) {
      score += 40;
      reasons.push(
        "Title match"
      );
    }

    if (
      comp.normalized_year &&
      record.year &&
      Number(comp.normalized_year) ===
        Number(record.year)
    ) {
      score += 10;
      reasons.push(
        "Year match"
      );
    }

    if (
      comp.normalized_label &&
      record.label &&
      clean(
        comp.normalized_label
      ) ===
        clean(record.label)
    ) {
      score += 10;
      reasons.push(
        "Label match"
      );
    }

    if (score >= 65) {
      const label =
        confidenceLabel(score);

      await supabase
        .from(
          "record_sales_matches"
        )
        .upsert(
          {
            record_id:
              record.id,
            user_id:
              record.user_id,
            normalized_sale_id:
              comp.id,
            match_score:
              score,
            match_confidence_label:
              label,
            match_reason:
              reasons.join(
                ", "
              ),
            matched_by:
              "matching_engine_v1",
          },
          {
            onConflict:
              "record_id,normalized_sale_id",
          }
        );

      results.push({
        recordId:
          record.id,
        score,
        label,
      });
    }
  }

  return {
    ok: true,
    matchesFound:
      results.length,
    results,
  };
}
