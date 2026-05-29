"use server";

import { createClient } from "../../src/lib/supabase/server";

/**
 * MARKET INTELLIGENCE ENGINE v2
 *
 * Pulls Discogs marketplace intelligence
 * and persists valuation intelligence
 * into records_clean_safe
 */

export async function syncMarketValues(limit = 25) {
  try {
    const supabase = await createClient();

    /**
     * STEP 1
     * Find records with release IDs
     */

    const { data: records, error: recordsError } =
      await supabase
        .from("records_clean_safe")
        .select(`
          id,
          title,
          artist,
          discogs_release_id
        `)
        .not("discogs_release_id", "is", null)
        .limit(limit);

    if (recordsError) {
      throw recordsError;
    }

    if (!records || records.length === 0) {
      return {
        success: true,
        updated: 0,
        message: "No records found",
      };
    }

    let updated = 0;
    const errors: string[] = [];

    /**
     * STEP 2
     * Pull marketplace intelligence
     */

    for (const record of records) {
      try {
        if (!record.discogs_release_id) continue;

        console.log(
          `MARKET SYNC → ${record.artist} - ${record.title}`
        );

        const response = await fetch(
          `https://api.discogs.com/marketplace/stats/${record.discogs_release_id}`,
          {
            headers: {
              "User-Agent": "CollectorIntelligence/1.0",
            },
            cache: "no-store",
          }
        );

        /**
         * Rate limiting
         */

        if (response.status === 429) {
          console.log(
            "RATE LIMITED — sleeping 10 seconds..."
          );

          await new Promise((resolve) =>
            setTimeout(resolve, 10000)
          );

          continue;
        }

        if (!response.ok) {
          throw new Error(
            `Discogs API error: ${response.status}`
          );
        }

        const marketData = await response.json();

        console.log(
          "MARKET DATA:",
          JSON.stringify(marketData, null, 2)
        );

        /**
         * Marketplace intelligence
         */

        const lowestPrice =
          marketData.lowest_price?.value ??
          marketData.lowest_price ??
          null;

        const medianPrice =
          marketData.median_price?.value ??
          marketData.median_price ??
          null;

        const highestPrice =
          marketData.highest_price?.value ??
          marketData.highest_price ??
          null;

        const numForSale =
          marketData.num_for_sale ?? 0;

        /**
         * Smart value logic
         * Tier 2 foundation
         */

        let estimatedValue =
          medianPrice ??
          lowestPrice ??
          highestPrice ??
          null;

        if (
          estimatedValue &&
          estimatedValue > 0
        ) {
          estimatedValue = Number(
            estimatedValue.toFixed(2)
          );
        }

        /**
         * Market pressure
         */

        let forSaleRatio = 0;

        if (
          numForSale &&
          estimatedValue &&
          estimatedValue > 0
        ) {
          forSaleRatio = Number(
            (numForSale / estimatedValue).toFixed(4)
          );
        }

        /**
         * STEP 3
         * Persist intelligence
         */

        const { error: updateError } =
          await supabase
            .from("records_clean_safe")
            .update({
              discogs_low_price: lowestPrice,

              estimated_value: estimatedValue,

              market_low_price: lowestPrice,
              market_median_price: medianPrice,
              market_high_price: highestPrice,

              market_num_for_sale: numForSale,
              market_for_sale_ratio: forSaleRatio,

              valuation_source:
                "discogs_marketplace_v2",

              valuation_updated_at:
                new Date().toISOString(),

              value_source:
                "discogs_marketplace_v2",

              value_last_updated:
                new Date().toISOString(),
            })
            .eq("id", record.id);

        if (updateError) {
          throw updateError;
        }

        updated++;

        console.log(
          `UPDATED ${record.artist} - ${record.title}`
        );

        /**
         * Gentle Discogs pacing
         */

        await new Promise((resolve) =>
          setTimeout(resolve, 2500)
        );

      } catch (err: unknown) {

        console.error(
          "MARKET SYNC ERROR:",
          record.artist,
          "-",
          record.title,
          err
        );

        errors.push(
          `${record.artist} - ${record.title}`
        );
      }
    }

    return {
      success: true,
      updated,
      errors,
    };

  } catch (err: unknown) {

    console.error(err);

    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
