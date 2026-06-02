"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";
import { refreshValueIntelligence } from "@/app/actions/value-intelligence";

/**
 * MARKET INTELLIGENCE ENGINE v3
 *
 * Pulls Discogs marketplace intelligence,
 * persists current valuation intelligence into records_clean_safe,
 * and appends every successful sync into market_history.
 *
 * This turns each market sync into proprietary CI market memory.
 */

type MarketSyncRecord = {
  id: number | string;
  user_id: string | null;
  title: string | null;
  artist: string | null;
  discogs_release_id: string | number | null;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function roundMoney(value: number | null): number | null {
  if (value === null) {
    return null;
  }

  return Number(value.toFixed(2));
}

export async function syncMarketValues(limit = 25) {
  try {
    const supabase = createAdminClient();

    /**
     * STEP 1
     * Find records with release IDs.
     *
     * user_id is now selected because market_history is user-scoped.
     */

    const { data: records, error: recordsError } =
      await supabase
        .from("records_clean_safe")
        .select(`
          id,
          user_id,
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
        historyInserted: 0,
        message: "No records found",
      };
    }

    let updated = 0;
    let historyInserted = 0;
    const errors: string[] = [];

    /**
     * STEP 2
     * Pull marketplace intelligence.
     */

    for (const record of records as MarketSyncRecord[]) {
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

        const releaseResponse = await fetch(
          "https://api.discogs.com/releases/" +
            record.discogs_release_id,
          {
            headers: {
              "User-Agent": "CollectorIntelligence/1.0",
            },
            cache: "no-store",
          }
        );

        let releaseData: Record<string, unknown> = {};

        if (releaseResponse.ok) {
          releaseData =
            await releaseResponse.json();
        }

        console.log(
          "RELEASE DATA:",
          JSON.stringify(releaseData, null, 2)
        );

        console.log(
          "MARKET DATA:",
          JSON.stringify(marketData, null, 2)
        );

        /**
         * Marketplace intelligence
         */

        const lowestPrice = toNumber(
          marketData.lowest_price?.value ??
            marketData.lowest_price
        );

        const medianPrice = toNumber(
          marketData.median_price?.value ??
            marketData.median_price
        );

        const highestPrice = toNumber(
          marketData.highest_price?.value ??
            marketData.highest_price
        );

        const numForSale =
          toNumber(
            releaseData["num_for_sale"] ??
              marketData.num_for_sale
          ) ?? 0;

        /**
         * Smart value logic
         * Tier 2 foundation
         */

        const estimatedValue = roundMoney(
          medianPrice ??
            lowestPrice ??
            highestPrice ??
            null
        );

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

        const capturedAt = new Date().toISOString();

        /**
         * STEP 3
         * Persist current intelligence.
         */

        console.log(
          "SUPPLY SIGNAL:",
          {
            artist: record.artist,
            title: record.title,
            numForSale,
            forSaleRatio,
          }
        );

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
                "discogs_marketplace_v3",

              valuation_updated_at:
                capturedAt,

              value_source:
                "discogs_marketplace_v3",

              value_last_updated:
                capturedAt,
            })
            .eq("id", record.id);

        if (updateError) {
          throw updateError;
        }

        /**
         * STEP 4
         * Append proprietary market memory.
         *
         * This is the moat:
         * every successful sync becomes historical CI intelligence.
         */

        if (record.user_id) {
          const { error: historyError } =
            await supabase
              .from("market_history")
              .insert({
                user_id: record.user_id,
                record_id: Number(record.id),
                discogs_release_id: toNumber(
                  record.discogs_release_id
                ),

                source: "discogs_marketplace_v3",

                low_price: lowestPrice,
                median_price: medianPrice,
                high_price: highestPrice,
                estimated_value: estimatedValue,

                discogs_low_price: lowestPrice,
                discogs_median_price: medianPrice,
                discogs_high_price: highestPrice,

                for_sale_count: numForSale,
                discogs_for_sale: numForSale,

                currency: "USD",

                raw_payload: {
                  marketData,
                  releaseData: {
                    id: releaseData["id"],
                    num_for_sale: releaseData["num_for_sale"],
                    lowest_price: releaseData["lowest_price"],
                    released: releaseData["released"],
                    country: releaseData["country"],
                    formats: releaseData["formats"],
                    labels: releaseData["labels"],
                  },
                },

                captured_at: capturedAt,
              });

          if (historyError) {
            console.error(
              "MARKET HISTORY INSERT ERROR:",
              record.artist,
              "-",
              record.title,
              historyError
            );

            errors.push(
              `History failed: ${record.artist} - ${record.title}`
            );
          } else {
            historyInserted++;
          }
        } else {
          console.warn(
            "MARKET HISTORY SKIPPED — missing user_id:",
            record.artist,
            "-",
            record.title
          );

          errors.push(
            `History skipped missing user_id: ${record.artist} - ${record.title}`
          );
        }

        await refreshValueIntelligence(
          String(record.id)
        );

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
      historyInserted,
      errors,
    };
  } catch (err: unknown) {
    console.error(err);

    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Unknown error",
    };
  }
}
