// app/actions/value-summary.ts

"use server";

import { createClient } from "../../src/lib/supabase/server";

export type CollectionValueSummary = {
  totalEstimatedValue: number;
  totalPurchaseValue: number;
  totalGainLoss: number;
  totalRecords: number;
  missingValueCount: number;
};

export async function getCollectionValueSummary(): Promise<CollectionValueSummary> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("records_clean_safe")
    .select(
      "estimated_value, purchase_price",
    );

  if (error || !data) {
    return {
      totalEstimatedValue: 0,
      totalPurchaseValue: 0,
      totalGainLoss: 0,
      totalRecords: 0,
      missingValueCount: 0,
    };
  }

  let totalEstimatedValue = 0;
  let totalPurchaseValue = 0;
  let missingValueCount = 0;

  for (const row of data) {
    const estimated =
      typeof row.estimated_value === "number"
        ? row.estimated_value
        : Number(row.estimated_value);

    const purchase =
      typeof row.purchase_price === "number"
        ? row.purchase_price
        : Number(row.purchase_price);

    if (Number.isFinite(estimated)) {
      totalEstimatedValue += estimated;
    } else {
      missingValueCount++;
    }

    if (Number.isFinite(purchase)) {
      totalPurchaseValue += purchase;
    }
  }

  return {
    totalEstimatedValue,
    totalPurchaseValue,
    totalGainLoss: totalEstimatedValue - totalPurchaseValue,
    totalRecords: data.length,
    missingValueCount,
  };
}