"use server";

import { createClient } from "../../src/lib/supabase/server";

export async function saveComparableSale(data: {
  record_id: number;

  source: string;

  title?: string;
  artist?: string;

  sale_price?: number;
  shipping_price?: number;
  total_price?: number;

  currency?: string;

  condition_media?: string;
  condition_sleeve?: string;

  sold_date?: string;

  listing_url?: string;
  image_url?: string;

  seller_name?: string;
  seller_feedback_score?: number;

  num_bids?: number;

  was_best_offer?: boolean;

  pressing_notes?: string;

  similarity_score?: number;
  confidence_score?: number;

  raw_payload?: any;
}) {
  const supabase = await createClient();

// =========================
// DUPLICATE CHECK
// =========================

const { data: existing } = await supabase
  .from("comparable_sales")
  .select("id")
  .eq("record_id", data.record_id)
  .eq("title", data.title)
  .limit(1);

if (existing && existing.length > 0) {
  return {
    success: true,
    skipped: true,
    reason: "Duplicate comparable already exists",
  };
}

// =========================
// INSERT NEW COMPARABLE
// =========================

const { data: inserted, error } = await supabase
  .from("comparable_sales")
 .upsert(
  {
    ...data,
    created_at: new Date().toISOString(),
  },
  {
    onConflict: "record_id,source,title",
    ignoreDuplicates: true,
  }
)
  .select()
  .single();

  if (error) {
    throw error;
  }

  return {
    success: true,
    comparable: inserted,
  };
}