"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";

type NormalizedSalesComp = {
  sale_price: number | null;
  sale_currency: string | null;
  sale_date: string | null;
  source_key: string | null;
  external_url: string | null;
};

type SalesMatchRow = {
  record_id: number;
  user_id: string | null;
  match_score: number | null;
  match_confidence_label: string | null;
  accepted: boolean | null;
  is_best_candidate: boolean | null;
  normalized_sales_comps: NormalizedSalesComp | NormalizedSalesComp[] | null;
};

function getComp(row: SalesMatchRow): NormalizedSalesComp | null {
  const comp = row.normalized_sales_comps;

  if (Array.isArray(comp)) {
    return comp[0] ?? null;
  }

  return comp ?? null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number | null, places = 2): number | null {
  if (value === null) return null;
  return Number(value.toFixed(places));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return round((sorted[middle - 1] + sorted[middle]) / 2, 2);
  }

  return round(sorted[middle], 2);
}

function confidenceLabel(score: number): string {
  if (score >= 85) return "High";
  if (score >= 65) return "Moderate";
  if (score >= 40) return "Developing";
  return "Low";
}

export async function recomputeSalesIntelligenceSummary(limit = 500) {
  const supabase = createAdminClient();

  const { data: matches, error } = await supabase
    .from("record_sales_matches")
    .select(`
      record_id,
      user_id,
      match_score,
      match_confidence_label,
      accepted,
      is_best_candidate,
      normalized_sales_comps (
        sale_price,
        sale_currency,
        sale_date,
        source_key,
        external_url
      )
    `)
    .not("record_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  const byRecord = new Map<number, SalesMatchRow[]>();

  for (const row of ((matches ?? []) as unknown as SalesMatchRow[])) {
    if (!row.record_id) continue;

    const existing = byRecord.get(row.record_id) ?? [];
    existing.push(row);
    byRecord.set(row.record_id, existing);
  }

  let summarized = 0;
  const errors: string[] = [];

  for (const [recordId, rows] of byRecord.entries()) {
    try {
      const userId = rows.find((row) => row.user_id)?.user_id ?? null;

      if (!userId) {
        continue;
      }

      const pricedRows = rows.filter((row) =>
        toNumber(getComp(row)?.sale_price)
      );

      const prices = pricedRows
        .map((row) => toNumber(getComp(row)?.sale_price))
        .filter((value): value is number => value !== null);

      const matchScores = rows
        .map((row) => toNumber(row.match_score))
        .filter((value): value is number => value !== null);

      const acceptedSalesCount = rows.filter(
        (row) => row.accepted === true
      ).length;

      const bestCandidateSalesCount = rows.filter(
        (row) => row.is_best_candidate === true
      ).length;

      const averagePrice =
        prices.length > 0
          ? round(
              prices.reduce((sum, price) => sum + price, 0) / prices.length,
              2
            )
          : null;

      const averageMatchScore =
        matchScores.length > 0
          ? round(
              matchScores.reduce((sum, score) => sum + score, 0) /
                matchScores.length,
              2
            )
          : null;

      const highestMatchScore =
        matchScores.length > 0 ? Math.max(...matchScores) : null;

      const confidenceScore =
        averageMatchScore !== null
          ? round(
              averageMatchScore +
                Math.min(bestCandidateSalesCount * 3, 10) +
                Math.min(prices.length * 2, 10),
              2
            )
          : null;

      const datedRows = pricedRows
        .filter((row) => getComp(row)?.sale_date)
        .sort((a, b) =>
          String(getComp(b)?.sale_date).localeCompare(
            String(getComp(a)?.sale_date)
          )
        );

      const lastSale = datedRows[0] ? getComp(datedRows[0]) : null;

      const sourceCounts: Record<string, number> = {};

      for (const row of rows) {
        const source = getComp(row)?.source_key ?? "unknown";
        sourceCounts[source] = (sourceCounts[source] ?? 0) + 1;
      }

      const priceSamples = pricedRows.slice(0, 25).map((row) => ({
        price: getComp(row)?.sale_price ?? null,
        currency: getComp(row)?.sale_currency ?? null,
        date: getComp(row)?.sale_date ?? null,
        source: getComp(row)?.source_key ?? null,
        url: getComp(row)?.external_url ?? null,
        score: row.match_score ?? null,
        confidence: row.match_confidence_label ?? null,
        bestCandidate: row.is_best_candidate ?? false,
      }));

      const { error: upsertError } = await supabase
        .from("sales_intelligence_summary")
        .upsert(
          {
            user_id: userId,
            record_id: recordId,

            matched_sales_count: rows.length,
            accepted_sales_count: acceptedSalesCount,
            best_candidate_sales_count: bestCandidateSalesCount,

            lowest_sale_price:
              prices.length > 0 ? Math.min(...prices) : null,
            median_sale_price: median(prices),
            average_sale_price: averagePrice,
            highest_sale_price:
              prices.length > 0 ? Math.max(...prices) : null,
            last_sale_price: toNumber(lastSale?.sale_price),
            last_sale_date: lastSale?.sale_date ?? null,

            currency:
              pricedRows[0] ? getComp(pricedRows[0])?.sale_currency ?? "USD" : "USD",

            average_match_score: averageMatchScore,
            highest_match_score: highestMatchScore,
            confidence_score: confidenceScore,
            confidence_label:
              confidenceScore !== null
                ? confidenceLabel(confidenceScore)
                : "Low",

            source_mix: sourceCounts,
            price_samples: priceSamples,

            calculated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "record_id",
          }
        );

      if (upsertError) {
        throw upsertError;
      }

      summarized++;
    } catch (err: unknown) {
      errors.push(
        `${recordId}: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  }

  return {
    ok: true,
    summarized,
    consideredMatches: matches?.length ?? 0,
    uniqueRecords: byRecord.size,
    errors,
  };
}
