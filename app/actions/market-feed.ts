"use server";

import { createClient } from "@/src/lib/supabase/server";

export async function getMarketFeed() {

  const supabase =
    await createClient();

  const { data, error } =
    await supabase
      .from("market_events")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(10);

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}