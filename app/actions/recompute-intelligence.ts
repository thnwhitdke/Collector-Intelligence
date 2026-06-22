"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";
import { pullSingleDiscogsCore } from "./pull-single-discogs";

function sleep(ms:number) {
  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}

export async function recomputeIntelligence(
  limit = 10
) {

  const supabase =
    createAdminClient();

  const {
    data: records,
    error
  } = await supabase
    .from(
      "records_clean_safe"
    )
    .select(`
      id,
      artist,
      title,
      discogs_release_id,
      volatility_score,
      demand_score,
      supply_pressure,
      market_momentum
    `)
    .not(
      "discogs_release_id",
      "is",
      null
    )
    .or(
      "volatility_score.eq.0,demand_score.eq.0,supply_pressure.eq.0,market_momentum.is.null"
    )
    .order(
      "id",
      {
        ascending:true
      }
    )
    .limit(limit);

  if (error) {
    return {
      ok:false,
      error:error.message
    };
  }

  let processed = 0;
  let updated = 0;
  const results = [];

  for (const record of records || []) {

    processed++;

    try {

      const formData =
        new FormData();

      formData.set(
        "id",
        String(record.id)
      );

      formData.set(
        "returnTo",
        "/collection"
      );

      const result =
        await pullSingleDiscogsCore(
          formData,
          {
            admin: true,
          }
        );

      if (
        result &&
        typeof result ===
          "object" &&
        result.ok === true
      ) {
        updated++;
      }

      results.push({
        id:record.id,
        ok:true,
        result
      });

      // Discogs throttle
      await sleep(1500);

    } catch (err:any) {

      results.push({
        id:record.id,
        ok:false,
        error:
          err?.message ||
          "Unknown error"
      });
    }
  }

  return {
    ok:true,
    processed,
    updated,
    results
  };
}
