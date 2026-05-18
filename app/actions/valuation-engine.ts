"use server";

import { createClient } from "../../src/lib/supabase/server";

export async function computeValuation(recordId: number) {
  const supabase = await createClient();

  // =========================
  // LOAD COMPARABLES
  // =========================

  const { data: comparables, error } = await supabase
    .from("comparable_sales")
    .select("*")
    .eq("record_id", recordId);

  if (error) {
    throw error;
  }

  if (!comparables || comparables.length === 0) {
    throw new Error("No comparables found");
  }

  // =========================
  // WEIGHTED VALUATION
  // =========================

  let weightedTotal = 0;
  let totalWeight = 0;

  for (const comp of comparables) {
    const similarity = comp.similarity_score || 0.5;

    const weight = similarity;

    weightedTotal += Number(comp.sale_price) * weight;
    totalWeight += weight;
  }

  const estimatedValue =
    totalWeight > 0 ? weightedTotal / totalWeight : 0;

  // =========================
  // CONFIDENCE SCORE
  // =========================

  const confidenceScore =
    comparables.reduce(
      (sum, comp) => sum + (comp.confidence_score || 0),
      0
    ) / comparables.length;

  // =========================
  // SAVE VALUATION HISTORY
  // =========================

  await supabase
    .from("valuation_history")
    .insert({
      record_id: recordId,

      estimated_value: estimatedValue,

      confidence_score: confidenceScore,

      valuation_method: "weighted-comparable-engine",

      comparables_used: comparables.length,

      recorded_at: new Date().toISOString(),
    });

  return {
    success: true,

    estimatedValue,

    confidenceScore,

    comparablesUsed: comparables.length,

    comparables,
  };
}