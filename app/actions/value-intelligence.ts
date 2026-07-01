// app/actions/value-intelligence.ts

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../src/lib/supabase/server";
import { calculateValueIntelligence } from "../../src/lib/value-intelligence";

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export async function refreshValueIntelligence(recordId: string) {
  const supabase = await createClient();

  const { data: record, error: readError } = await supabase
    .from("records_clean_safe")
    .select(
      `
      id,
      discogs_low_price,
      discogs_median_price,
      discogs_high_price,
      ebay_last_sold_price,
      ebay_avg_sold_price,
      ebay_sold_count,
      manual_comp_price,
      purchase_price,
      condition_grade,
      value_last_updated,
      market_num_for_sale,
      market_for_sale_ratio
      `,
    )
    .eq("id", recordId)
    .single();

  if (readError || !record) {
    throw new Error(readError?.message ?? "Record not found.");
  }

  const { data: salesSummary } = await supabase
    .from("sales_intelligence_summary")
    .select(`
      median_sale_price,
      average_sale_price,
      lowest_sale_price,
      highest_sale_price,
      matched_sales_count,
      confidence_score
    `)
    .eq("record_id", recordId)
    .maybeSingle();

  const { data: auctionSummary } = await supabase
    .from("external_market_comp_summary_safe")
    .select(`
      median_price,
      avg_price,
      low_price,
      high_price,
      auction_count
    `)
    .eq("record_id", recordId)
    .maybeSingle();

  const bestSalesMedian =
    toNumber(auctionSummary?.median_price) ??
    toNumber(salesSummary?.median_sale_price);

  const bestSalesAverage =
    toNumber(auctionSummary?.avg_price) ??
    toNumber(salesSummary?.average_sale_price);

  const bestSalesLowest =
    toNumber(auctionSummary?.low_price) ??
    toNumber(salesSummary?.lowest_sale_price);

  const bestSalesHighest =
    toNumber(auctionSummary?.high_price) ??
    toNumber(salesSummary?.highest_sale_price);

  const bestSalesCount =
    toNumber(auctionSummary?.auction_count) ??
    toNumber(salesSummary?.matched_sales_count);

  const result = calculateValueIntelligence({
    discogsLowPrice: toNumber(record.discogs_low_price),
    discogsMedianPrice: toNumber(record.discogs_median_price),
    discogsHighPrice: toNumber(record.discogs_high_price),

    salesMedianPrice: bestSalesMedian,
    salesAveragePrice: bestSalesAverage,
    salesLowestPrice: bestSalesLowest,
    salesHighestPrice: bestSalesHighest,
    salesMatchedCount: bestSalesCount,
    salesConfidenceScore: toNumber(salesSummary?.confidence_score),

    ebayLastSoldPrice: toNumber(record.ebay_last_sold_price),
    ebayAvgSoldPrice: toNumber(record.ebay_avg_sold_price),
    ebaySoldCount: toNumber(record.ebay_sold_count),
    manualCompPrice: toNumber(record.manual_comp_price),
    purchasePrice: toNumber(record.purchase_price),
    conditionGrade:
      typeof record.condition_grade === "string" ? record.condition_grade : null,
    valueLastUpdated:
      typeof record.value_last_updated === "string"
        ? record.value_last_updated
        : null,
    marketNumForSale: toNumber(record.market_num_for_sale),
    marketForSaleRatio: toNumber(record.market_for_sale_ratio),
  });

  const { error: updateError } = await supabase
    .from("records_clean_safe")
    .update({
      estimated_value: result.estimatedValue,

      market_consensus_value:
        result.marketConsensusValue,

      market_consensus_confidence:
        result.marketConsensusConfidence,

      market_consensus_source:
        result.marketConsensusSource,

      market_consensus_reason:
        result.marketConsensusReason,

      value_confidence_score: result.confidenceScore,
      value_signal: result.signal,
      value_badges: result.badges,
      rarity_score: result.rarityScore,
      market_momentum: result.marketMomentum,
      collector_iq_score: result.collectorIqScore,
      valuation_confidence: result.confidenceScore,
      value_last_updated: new Date().toISOString(),
    })
    .eq("id", recordId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/collection");
  revalidatePath(`/collection/${recordId}`);

  return result;
}

export async function pullAndSaveDiscogsValue(recordId: string): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const result = await refreshValueIntelligence(recordId);

    return {
      ok: true,
      message: `Value intelligence refreshed. Estimated value: ${
        result.estimatedValue === null ? "not enough data" : `$${result.estimatedValue.toFixed(2)}`
      }. Confidence: ${result.confidenceScore}/100.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Value intelligence could not be refreshed.",
    };
  }
}

export async function updateManualValueComp(formData: FormData) {
  const supabase = await createClient();

  const recordId = String(formData.get("recordId") ?? "");
  const manualCompPrice = toNumber(formData.get("manualCompPrice"));
  const manualCompNote = String(formData.get("manualCompNote") ?? "").trim();
  const ebayLastSoldPrice = toNumber(formData.get("ebayLastSoldPrice"));
  const ebayAvgSoldPrice = toNumber(formData.get("ebayAvgSoldPrice"));
  const ebaySoldCount = toNumber(formData.get("ebaySoldCount"));
  const ebayCompUrl = String(formData.get("ebayCompUrl") ?? "").trim();
  const conditionGrade = String(formData.get("conditionGrade") ?? "").trim();

  if (!recordId) {
    throw new Error("Missing record id.");
  }

  const { error } = await supabase
    .from("records_clean_safe")
    .update({
      manual_comp_price: manualCompPrice,
      manual_comp_note: manualCompNote || null,
      ebay_last_sold_price: ebayLastSoldPrice,
      ebay_avg_sold_price: ebayAvgSoldPrice,
      ebay_sold_count: ebaySoldCount,
      ebay_comp_url: ebayCompUrl || null,
      condition_grade: conditionGrade || null,
    })
    .eq("id", recordId);

  if (error) {
    throw new Error(error.message);
  }

  await refreshValueIntelligence(recordId);

  revalidatePath("/collection");
  revalidatePath(`/collection/${recordId}`);
}

export async function recomputeCIValueIntelligence() {
  const supabase = await createClient();

  const staleDate = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();

  const { data: records, error } = await supabase
    .from("records_clean_safe")
    .select(`
      id,
      value_last_updated
    `)
    .or(`value_last_updated.is.null,value_last_updated.lt.${staleDate}`)
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  let processed = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const record of records ?? []) {
    processed++;

    try {
      await refreshValueIntelligence(
        String(record.id),
      );

      updated++;
    } catch (err) {
      errors.push(
        `${record.id}: ${
          err instanceof Error
            ? err.message
            : "unknown"
        }`,
      );
    }
  }

  return {
    ok: true,
    processed,
    updated,
    errors,
  };
}
