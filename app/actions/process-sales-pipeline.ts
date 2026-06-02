"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";
import { normalizeSalesObservation } from "@/app/actions/sales-normalization";
import { matchSalesCompToRecords } from "@/app/actions/sales-matching";

type RawSalesObservation = {
  id: number;
  normalization_status: string | null;
};

export async function processSalesPipeline(limit = 25) {
  const supabase = createAdminClient();

  const { data: pendingRows, error } = await supabase
    .from("raw_sales_observations")
    .select("id, normalization_status")
    .or("normalization_status.is.null,normalization_status.eq.pending")
    .order("id", { ascending: true })
    .limit(limit);

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  if (!pendingRows || pendingRows.length === 0) {
    return {
      ok: true,
      processed: 0,
      normalized: 0,
      matched: 0,
      errors: [],
      message: "No pending raw sales observations",
    };
  }

  let normalized = 0;
  let matched = 0;
  const errors: string[] = [];

  for (const row of pendingRows as RawSalesObservation[]) {
    try {
      const normalizedResult = await normalizeSalesObservation(row.id);

      if (!normalizedResult.ok || !normalizedResult.normalizedCompId) {
        errors.push(
          `Normalize failed raw ${row.id}: ${normalizedResult.error ?? "Unknown error"}`
        );

        await supabase
          .from("raw_sales_observations")
          .update({
            normalization_status: "failed",
          })
          .eq("id", row.id);

        continue;
      }

      normalized++;

      const matchResult = await matchSalesCompToRecords(
        normalizedResult.normalizedCompId
      );

      if (!matchResult.ok) {
        errors.push(
          `Match failed raw ${row.id}: ${matchResult.error ?? "Unknown error"}`
        );

        continue;
      }

      matched += matchResult.matchesFound ?? 0;
    } catch (err: unknown) {
      errors.push(
        `Pipeline failed raw ${row.id}: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );

      await supabase
        .from("raw_sales_observations")
        .update({
          normalization_status: "failed",
        })
        .eq("id", row.id);
    }
  }

  return {
    ok: true,
    processed: pendingRows.length,
    normalized,
    matched,
    errors,
  };
}
