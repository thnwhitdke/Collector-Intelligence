"use server";

import { createClient } from "../../src/lib/supabase/server";
import { saveComparableSale } from "./comparables";

export async function discoverComparableCandidates(recordId: number) {
  const supabase = await createClient();

  // =========================
  // LOAD SEARCH PROFILE
  // =========================

  const { data: profiles, error: profileError } = await supabase
  .from("market_search_profiles")
  .select("*")
  .eq("record_id", recordId);

console.log("PROFILE QUERY RESULT:", profiles);
console.log("PROFILE QUERY ERROR:", profileError);

if (profileError) {
  throw new Error(profileError.message);
}

if (!profiles || profiles.length === 0) {
  throw new Error(`No search profiles found for record ${recordId}`);
}

const profile = profiles[0];

  // =========================
  // MOCK COMPARABLE RESULTS
  // =========================

  // Future:
  // eBay API
  // Discogs API
  // Marketplace intelligence

  const mockComparables = [
    {
      source: "ebay",
      title: `${profile.normalized_fingerprint} comparable 1`,
      sale_price: 42.99,
      condition: "VG+",
      similarity_score: 0.94,
    },

    {
      source: "discogs",
      title: `${profile.normalized_fingerprint} comparable 2`,
      sale_price: 39.50,
      condition: "VG",
      similarity_score: 0.88,
    },

    {
      source: "ebay",
      title: `${profile.normalized_fingerprint} comparable 3`,
      sale_price: 47.25,
      condition: "NM",
      similarity_score: 0.97,
    },
  ];

  for (const comp of mockComparables) {
  await saveComparableSale({
    record_id: recordId,

    source: comp.source,

    title: comp.title,
    artist: "",

    sale_price: comp.sale_price,
    shipping_price: 0,
    total_price: comp.sale_price,

    currency: "USD",

    condition_media: comp.condition,
    condition_sleeve: comp.condition,

    sold_date: new Date().toISOString(),

    listing_url: "",

    seller_name: "autonomous-engine",

    seller_feedback_score: 1000,

    num_bids: 0,

    was_best_offer: false,

    pressing_notes: "Auto-discovered comparable",

    similarity_score: comp.similarity_score,

    confidence_score: comp.similarity_score,

    raw_payload: comp,
  });
}

  return {
    success: true,
    recordId,
    ebayQuery: profile.ebay_search_query,
    discogsQuery: profile.discogs_search_query,
    candidates: mockComparables,
  };
}