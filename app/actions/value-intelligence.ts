// app/actions/value-intelligence.ts

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../src/lib/supabase/server";
import { pullDiscogsValueData } from "../../src/lib/discogs-value";

export type PullRecordValueState = {
  ok: boolean;
  message: string;
};

type PriceHistoryPoint = {
  source: "discogs";
  pulled_at: string;
  low: number | null;
  median: number | null;
  high: number | null;
  estimated: number | null;
};

export async function pullAndSaveDiscogsValue(
  recordId: string,
): Promise<PullRecordValueState> {
  const supabase = await createClient();

  const { data: record, error: fetchError } = await supabase
    .from("records_clean_safe")
    .select(
      "id, discogs_release_id, price_history, purchase_price, estimated_value",
    )
    .eq("id", recordId)
    .single();

  if (fetchError || !record) {
    return {
      ok: false,
      message: "Could not find this record in Supabase.",
    };
  }

  if (!record.discogs_release_id) {
    return {
      ok: false,
      message: "This record does not have a Discogs release ID yet.",
    };
  }

  try {
    const pulled = await pullDiscogsValueData(String(record.discogs_release_id));

    const existingHistory = Array.isArray(record.price_history)
      ? (record.price_history as PriceHistoryPoint[])
      : [];

    const nextHistory: PriceHistoryPoint[] = [
      ...existingHistory,
      {
        source: "discogs",
        pulled_at: pulled.pulledAt,
        low: pulled.lowPrice,
        median: pulled.medianPrice,
        high: pulled.highPrice,
        estimated: pulled.estimatedValue,
      },
    ];

    const { error: updateError } = await supabase
      .from("records_clean_safe")
      .update({
        value_source: pulled.source,
        discogs_low_price: pulled.lowPrice,
        discogs_median_price: pulled.medianPrice,
        discogs_high_price: pulled.highPrice,
        estimated_value: pulled.estimatedValue,
        value_last_updated: pulled.pulledAt,
        price_history: nextHistory,
      })
      .eq("id", recordId);

    if (updateError) {
      return {
        ok: false,
        message: updateError.message,
      };
    }

    revalidatePath("/collection");
    revalidatePath(`/collection/${recordId}`);

    return {
      ok: true,
      message: "Discogs value intelligence updated.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unknown Discogs value pull error.",
    };
  }
}