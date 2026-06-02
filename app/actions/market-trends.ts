"use server";

import { createAdminClient } from "@/src/lib/supabase/admin";

type MarketHistoryRow = {
  id: number;
  user_id: string | null;
  record_id: number | null;
  estimated_value: number | null;
  for_sale_count: number | null;
  captured_at: string | null;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function round(value: number | null, places = 4): number | null {
  if (value === null) {
    return null;
  }

  return Number(value.toFixed(places));
}

function percentDelta(
  latest: number | null,
  previous: number | null
): number | null {
  if (
    latest === null ||
    previous === null ||
    previous === 0
  ) {
    return null;
  }

  return round(((latest - previous) / previous) * 100, 2);
}

function classifySignal(
  priceDeltaPercent: number | null,
  supplyDeltaPercent: number | null
) {
  const price = priceDeltaPercent ?? 0;
  const supply = supplyDeltaPercent ?? 0;

  const movementScore =
    Math.abs(price) + Math.abs(supply);

  let signal_label = "Stable";
  let signal_strength = "Low";

  if (price > 5 && supply < 0) {
    signal_label = "Strengthening";
  } else if (price > 5) {
    signal_label = "Price Rising";
  } else if (price < -5 && supply > 0) {
    signal_label = "Cooling";
  } else if (price < -5) {
    signal_label = "Price Falling";
  } else if (supply < -10) {
    signal_label = "Supply Tightening";
  } else if (supply > 10) {
    signal_label = "Supply Expanding";
  }

  if (movementScore >= 40) {
    signal_strength = "High";
  } else if (movementScore >= 15) {
    signal_strength = "Medium";
  }

  return {
    signal_label,
    signal_strength,
  };
}

function momentumScore(
  priceDeltaPercent: number | null,
  supplyDeltaPercent: number | null
): number {
  const price = priceDeltaPercent ?? 0;
  const supply = supplyDeltaPercent ?? 0;

  /**
   * Positive price movement increases momentum.
   * Falling supply increases pressure, so supply movement is inverted.
   */
  return round(price - supply * 0.5, 4) ?? 0;
}

export async function recomputeMarketTrendSignals(limit = 500) {
  const supabase = createAdminClient();

  const { data: latestRows, error: latestError } =
    await supabase
      .from("market_history")
      .select(
        "id,user_id,record_id,estimated_value,for_sale_count,captured_at"
      )
      .not("record_id", "is", null)
      .order("captured_at", { ascending: false })
      .limit(limit * 4);

  if (latestError) {
    throw latestError;
  }

  const byRecord = new Map<number, MarketHistoryRow[]>();

  for (const row of (latestRows ?? []) as MarketHistoryRow[]) {
    if (!row.record_id) continue;

    const existing = byRecord.get(row.record_id) ?? [];
    existing.push(row);
    byRecord.set(row.record_id, existing);
  }

  let calculated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [recordId, rows] of byRecord.entries()) {
    try {
      const latest = rows[0];
      const previous = rows[1];

      if (!latest || !previous || !latest.user_id) {
        skipped++;
        continue;
      }

      const latestValue = toNumber(latest.estimated_value);
      const previousValue = toNumber(previous.estimated_value);

      const latestSupply = toNumber(latest.for_sale_count);
      const previousSupply = toNumber(previous.for_sale_count);

      const priceDelta =
        latestValue !== null && previousValue !== null
          ? round(latestValue - previousValue, 2)
          : null;

      const priceDeltaPercent =
        percentDelta(latestValue, previousValue);

      const supplyDelta =
        latestSupply !== null && previousSupply !== null
          ? latestSupply - previousSupply
          : null;

      const supplyDeltaPercent =
        percentDelta(latestSupply, previousSupply);

      const marketMomentum = momentumScore(
        priceDeltaPercent,
        supplyDeltaPercent
      );

      const volatilitySeed = round(
        Math.abs(priceDeltaPercent ?? 0) +
          Math.abs(supplyDeltaPercent ?? 0),
        4
      );

      const changeDetected =
        (priceDelta !== null && priceDelta !== 0) ||
        (supplyDelta !== null && supplyDelta !== 0);

      const classification = classifySignal(
        priceDeltaPercent,
        supplyDeltaPercent
      );

      const { error: upsertError } =
        await supabase
          .from("market_trend_signals")
          .upsert(
            {
              user_id: latest.user_id,
              record_id: recordId,

              latest_history_id: latest.id,
              previous_history_id: previous.id,

              source: "market_history",

              latest_estimated_value: latestValue,
              previous_estimated_value: previousValue,
              price_delta: priceDelta,
              price_delta_percent: priceDeltaPercent,

              latest_for_sale_count: latestSupply,
              previous_for_sale_count: previousSupply,
              supply_delta: supplyDelta,
              supply_delta_percent: supplyDeltaPercent,

              market_momentum: marketMomentum,
              volatility_seed: volatilitySeed,

              signal_label: classification.signal_label,
              signal_strength: classification.signal_strength,

              change_detected: changeDetected,

              calculated_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "record_id",
            }
          );

      if (upsertError) {
        throw upsertError;
      }

      calculated++;
    } catch (err: unknown) {
      errors.push(
        `${recordId}: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  }

  return {
    success: true,
    calculated,
    skipped,
    errors,
  };
}
