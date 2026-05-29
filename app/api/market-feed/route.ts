import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

function toNumber(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(/[$,]/g, ""));

  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET() {
  const supabase = createAdminClient();

  const { data: historyRows, error: historyError } = await supabase
    .from("market_history")
    .select(`
      id,
      record_id,
      discogs_low_price,
      discogs_median_price,
      discogs_high_price,
      discogs_for_sale,
      market_signal,
      captured_at
    `)
    .order("captured_at", { ascending: false })
    .limit(50);

  if (historyError) {
    return NextResponse.json(
      { error: historyError.message },
      { status: 500 }
    );
  }

  const recordIds = Array.from(
    new Set(
      (historyRows ?? [])
        .map((row) => String(row.record_id))
        .filter(Boolean)
    )
  );

  const { data: records } = recordIds.length
    ? await supabase
        .from("records_clean_safe")
        .select("id, artist, title")
        .in("id", recordIds)
    : { data: [] };

  const recordMap = new Map(
    (records ?? []).map((record) => [
      String(record.id),
      record,
    ])
  );

  const feed = (historyRows ?? [])
    .map((row) => {
      const record = recordMap.get(String(row.record_id));

      const low = toNumber(row.discogs_low_price);
      const median = toNumber(row.discogs_median_price);
      const high = toNumber(row.discogs_high_price);
      const forSale = toNumber(row.discogs_for_sale);

      let status: "LIVE" | "ALERT" | "TRENDING" = "LIVE";
      let color: "blue" | "green" | "orange" | "red" = "blue";
      let change = 0;
      let message = row.market_signal || "Market snapshot captured";

      if (forSale !== null && forSale <= 2) {
        status = "ALERT";
        color = "orange";
        message = `${message} · Thin market: ${forSale} listed`;
        change = forSale;
      } else if (high !== null && median !== null && median > 0 && high > median) {
        status = "ALERT";
        color = "red";
        change = Math.round(((high - median) / median) * 100);
        message = `${message} · High spread: $${median} → $${high}`;
      } else if (median !== null && low !== null && low > 0 && median > low) {
        status = "TRENDING";
        color = "green";
        change = Math.round(((median - low) / low) * 100);
        message = `${message} · Median above low: $${low} → $${median}`;
      }

      return {
        id: `history-${row.id}`,
        status,
        color,
        artist: record?.artist ?? "Unknown Artist",
        title: record?.title ?? `Record ${row.record_id}`,
        message,
        change,
        timestamp: row.captured_at,
        source: "market_history",
      };
    })
    .slice(0, 10);

  return NextResponse.json({
    feed,
    source: "market_history",
  });
}
