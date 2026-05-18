"use server";

import { createClient } from "../../src/lib/supabase/server";

/**
 * MARKET VALUE ENGINE
 *
 * Pulls Discogs marketplace statistics
 * and writes valuation intelligence
 * into records_clean_safe
 */

export async function syncMarketValues(limit = 25) {
  try {
    const supabase = await createClient();

    /**
     * STEP 1:
     * Find records with Discogs release IDs
     */

    const { data: records, error: recordsError } = await supabase
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
     * STEP 2:
     * Pull marketplace data from Discogs
     */

    for (const record of records) {
      try {
        if (!record.discogs_release_id) continue;

        console.log(
          `Syncing market data for: ${record.artist} - ${record.title}`
        );

        const response = await fetch(
          `https://api.discogs.com/releases/${record.discogs_release_id}`,
          {
            headers: {
              "User-Agent": "CollectorIntelligence/1.0",
            },
            cache: "no-store",
          }
        );

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

        const discogsData = await response.json();

        console.log(
          "DISCOGS RESPONSE:",
          JSON.stringify(discogsData, null, 2)
        );

        /**
         * Marketplace statistics
         */

        const lowestPrice =
          discogsData.lowest_price ?? null;

        const numForSale =
          discogsData.num_for_sale ?? null;

        const blockedFromSale =
          discogsData.blocked_from_sale ?? false;

        /**
         * Smart estimated value logic
         */

        let estimatedValue = lowestPrice;

        if (
          estimatedValue &&
          estimatedValue > 0
        ) {
          estimatedValue = Number(
            estimatedValue.toFixed(2)
          );
        }

        /**
         * STEP 3:
         * Update database
         */

        const { error: updateError } = await supabase
          .from("records_clean_safe")
          .update({
            discogs_low_price: lowestPrice,
            estimated_value: estimatedValue,
            value_source: "discogs_marketplace",
            value_last_updated: new Date().toISOString(),
            market_num_for_sale: numForSale,
            market_blocked_from_sale: blockedFromSale,
          })
          .eq("id", record.id);

        if (updateError) {
          throw updateError;
        }

        updated++;

        /**
         * Gentle rate limiting
         */

        await new Promise((resolve) =>
          setTimeout(resolve, 2500)
        );

      } catch (err: any) {

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

  } catch (err: any) {

    console.error(err);

    return {
      success: false,
      error: err.message,
    };
  }
}