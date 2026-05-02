"use server";

import { createClient } from "@/src/lib/supabase/server";

type Result = {
  message: string;
};

export async function pullDiscogsMarketSnapshot(batchSize: number = 10): Promise<Result> {
  const supabase = await createClient();

  const { data: records, error } = await supabase
    .from("records_clean_safe")
    .select("id, discogs_release_id")
    .not("discogs_release_id", "is", null)
    .limit(batchSize);

  if (error || !records) {
    return { message: "Failed to fetch records." };
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const record of records) {
    try {
      const releaseId = record.discogs_release_id;

      if (!releaseId) {
        skipped++;
        continue;
      }

      // 🔹 Fetch release stats
      const res = await fetch(`https://api.discogs.com/releases/${releaseId}`, {
        headers: {
          Authorization: `Discogs token=${process.env.DISCOGS_TOKEN}`,
          "User-Agent": process.env.DISCOGS_USER_AGENT!,
        },
      });

      if (!res.ok) {
        failed++;
        continue;
      }

      const json = await res.json();

      const numForSale = json.num_for_sale ?? null;
      const numHave = json.community?.have ?? null;
      const numWant = json.community?.want ?? null;

      // 🔹 Marketplace stats (separate endpoint)
      const marketRes = await fetch(`https://api.discogs.com/marketplace/stats/${releaseId}`, {
        headers: {
          Authorization: `Discogs token=${process.env.DISCOGS_TOKEN}`,
          "User-Agent": process.env.DISCOGS_USER_AGENT!,
        },
      });

      let lowestPrice = null;

      if (marketRes.ok) {
        const marketJson = await marketRes.json();
        lowestPrice = marketJson.lowest_price?.value ?? null;
      }

      await supabase
        .from("records_clean_safe")
        .update({
          discogs_num_for_sale: numForSale,
          discogs_lowest_price: lowestPrice,
          discogs_num_have: numHave,
          discogs_num_want: numWant,
          discogs_market_last_updated: new Date().toISOString(),
        })
        .eq("id", record.id);

      updated++;

      // 🧠 Rate limiting protection
      await new Promise((r) => setTimeout(r, 1100));

    } catch (e) {
      failed++;
    }
  }

  return {
    message: `Market snapshot → Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`,
  };
}