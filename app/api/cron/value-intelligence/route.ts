import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { calculateValueIntelligence } from "@/src/lib/value-intelligence";

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

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: records, error } = await supabase
      .from("records_clean_safe")
      .select(`
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
      `)
      .is("market_consensus_confidence", null)
      .limit(250);

    if (error) {
      throw new Error(error.message);
    }

    const recordIds = (records || []).map((record) => record.id);

    const { data: auctionSummaries, error: auctionError } = recordIds.length
      ? await supabase
          .from("external_market_comp_summary_safe")
          .select("record_id, auction_count, median_price")
          .in("record_id", recordIds)
      : { data: [], error: null };

    if (auctionError) {
      throw new Error(auctionError.message);
    }

    const auctionSummaryByRecordId = new Map(
      (auctionSummaries || []).map((summary) => [
        summary.record_id,
        summary,
      ]),
    );

    let updated = 0;
    const errors: string[] = [];

    for (const record of records || []) {
      try {
        const result = calculateValueIntelligence({
          discogsLowPrice: toNumber(record.discogs_low_price),
          discogsMedianPrice: toNumber(record.discogs_median_price),
          discogsHighPrice: toNumber(record.discogs_high_price),
          ebayLastSoldPrice: toNumber(record.ebay_last_sold_price),
          ebayAvgSoldPrice: toNumber(record.ebay_avg_sold_price),
          ebaySoldCount: toNumber(record.ebay_sold_count),
          manualCompPrice: toNumber(record.manual_comp_price),
          purchasePrice: toNumber(record.purchase_price),
          conditionGrade:
            typeof record.condition_grade === "string"
              ? record.condition_grade
              : null,
          valueLastUpdated:
            typeof record.value_last_updated === "string"
              ? record.value_last_updated
              : null,
          marketNumForSale: toNumber(record.market_num_for_sale),
          marketForSaleRatio: toNumber(record.market_for_sale_ratio),
        });

        const auctionSummary = auctionSummaryByRecordId.get(record.id);
        const auctionMedian = toNumber(auctionSummary?.median_price);
        const auctionCount = toNumber(auctionSummary?.auction_count);
        const existingConsensus = toNumber(result.marketConsensusValue);
        const hasAuctionMedian =
          auctionMedian !== null &&
          auctionMedian > 0 &&
          auctionCount !== null &&
          auctionCount > 0;

        const blendedMarketConsensusValue =
          hasAuctionMedian && existingConsensus !== null
            ? Math.round(existingConsensus * 0.7 + auctionMedian * 0.3)
            : hasAuctionMedian
              ? Math.round(auctionMedian)
              : result.marketConsensusValue;

        const blendedMarketConsensusSource =
          hasAuctionMedian && existingConsensus !== null
            ? "discogs_plus_popsike_auction"
            : hasAuctionMedian
              ? "popsike_auction"
              : result.marketConsensusSource;

        const blendedMarketConsensusReason =
          hasAuctionMedian && existingConsensus !== null
            ? `${result.marketConsensusReason} Auction median from ${auctionCount} valuation-grade Popsike comp${auctionCount === 1 ? "" : "s"} blended at 30%.`
            : hasAuctionMedian
              ? `Auction median from ${auctionCount} valuation-grade Popsike comp${auctionCount === 1 ? "" : "s"}.`
              : result.marketConsensusReason;

        const blendedEstimatedValue =
          blendedMarketConsensusValue ?? result.estimatedValue;

        const { error: updateError } = await supabase
          .from("records_clean_safe")
          .update({
            estimated_value: blendedEstimatedValue,
            market_consensus_value: blendedMarketConsensusValue,
            market_consensus_confidence: result.marketConsensusConfidence,
            market_consensus_source: blendedMarketConsensusSource,
            market_consensus_reason: blendedMarketConsensusReason,
            value_confidence_score: result.confidenceScore,
            value_signal: result.signal,
            value_badges: result.badges,
            rarity_score: result.rarityScore,
            market_momentum: result.marketMomentum,
            collector_iq_score: result.collectorIqScore,
            valuation_confidence: String(result.confidenceScore),
            value_last_updated: new Date().toISOString(),
          })
          .eq("id", record.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        updated++;
      } catch (err) {
        errors.push(
          `${record.id}: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      errors,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}
