"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../src/lib/supabase/server";

export type ValueQueueRecord = {
  id: string;
  artist: string | null;
  title: string | null;
  format: string | null;
  year_released: string | number | null;
  label: string | null;
  catalogue_number: string | null;
  discogs_release_id: string | number | null;
  estimated_value: number | string | null;
  discogs_low_price: number | string | null;
  discogs_median_price: number | string | null;
  discogs_high_price: number | string | null;
  value_last_updated: string | null;
  value_source: string | null;
  cover_url: string | null;
  purchase_price?: number | string | null;
  value_pull_status?: string | null;
  value_pull_note?: string | null;
  value_pull_last_attempted_at?: string | null;
  discogs_sale_blocked?: boolean | null;
  discogs_sale_blocked_reason?: string | null;
  queue_priority?: number;
};

async function getCurrentUserId() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  return user.id;
}

export async function getValueQueue(): Promise<ValueQueueRecord[]> {
  const supabase = await createClient();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("records_clean_safe")
    .select("*")
    .eq("user_id", userId)
    .not("discogs_release_id", "is", null)
    .neq("discogs_sale_blocked", true)
    .limit(100);

  if (error) throw new Error(error.message);

  return data ?? [];
}

export async function pullBatchDiscogsValues(limit = 10) {
  void limit;

  return {
    ok: true,
    message: "Temporary stub working",
    updated: 0,
    skipped: 0,
    failed: 0,
    markedUnavailable: 0,
    pulledRecords: [],
  };
}
