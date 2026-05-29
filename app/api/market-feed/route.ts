import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

function toNumber(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(/[$,]/g, ""));

  return Number.isFinite(parsed) ? parsed : null;
}

function shuffle<T>(array: T[]) {
  return [...array].sort(() => Math.random() - 0.5);
}

export async function GET() {
  const supabase = createAdminClient();

  const { data: historyRows, error } = await supabase
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
    .order("captured_at", {
      ascending: false,
    })
    .limit(250);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const ids = Array.from(
    new Set(
      (historyRows ?? [])
        .map((r) => String(r.record_id))
        .filter(Boolean)
    )
  );

  const { data: records } = ids.length
    ? await supabase
        .from("records_clean_safe")
        .select(`
          id,
          artist,
          title,
          rarity_score
        `)
        .in("id", ids)
    : { data: [] };

  const recordMap = new Map(
    (records ?? []).map((r) => [
      String(r.id),
      r,
    ])
  );

  const feed = (historyRows ?? []).map((row) => {
    const record =
      recordMap.get(String(row.record_id));

    const artist =
      record?.artist ??
      "Unknown Artist";

    const title =
      record?.title ??
      `Record ${row.record_id}`;

    const rarity =
      toNumber(record?.rarity_score) ?? 0;

    const low =
      toNumber(row.discogs_low_price);

    const median =
      toNumber(row.discogs_median_price);

    const high =
      toNumber(row.discogs_high_price);

    const forSale =
      toNumber(row.discogs_for_sale);

    let status = "LIVE";
    let color = "blue";
    let change = 0;
    let message =
      row.market_signal ||
      "Market signal";

    if (
      forSale !== null &&
      forSale <= 2
    ) {
      status = "ALERT";
      color = "orange";
      message =
        `${message} · Thin market: ${forSale} listed`;
      change = forSale;
    }
    else if (
      high &&
      median &&
      high > median
    ) {
      status = "ALERT";
      color = "red";
      change = Math.round(
        ((high - median) /
          Math.max(median, 1)) *
          100
      );

      message =
        `${message} · Spread $${median} → $${high}`;
    }
    else if (
      median &&
      low &&
      median > low
    ) {
      status = "TRENDING";
      color = "green";
      change = Math.round(
        ((median - low) /
          Math.max(low, 1)) *
          100
      );

      message =
        `${message} · Market active`;
    }

    return {
      id: `history-${row.id}`,
      artist,
      title,
      rarity,
      status,
      color,
      message,
      change,
      timestamp: row.captured_at,
    };
  });

  const deduped = [];
  const seen = new Set();

  for (const item of feed) {
    const key =
      `${item.artist}-${item.title}`.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    deduped.push(item);
  }

  const thin = deduped.filter(
    (i) => i.color === "orange"
  );

  const volatile = deduped.filter(
    (i) => i.color === "red"
  );

  const rare = deduped
    .filter((i) => i.rarity >= 60);

  const random =
    shuffle(deduped);

  const diversified = [
    ...thin.slice(0, 8),
    ...volatile.slice(0, 8),
    ...rare.slice(0, 8),
    ...random.slice(0, 20),
  ];

  const finalFeed = [];
  const finalSeen = new Set();

  for (const item of diversified) {
    const key =
      `${item.artist}-${item.title}`.toLowerCase();

    if (finalSeen.has(key)) continue;

    finalSeen.add(key);
    finalFeed.push(item);
  }

  return NextResponse.json({
    feed: finalFeed.slice(0, 40),
    source:
      "market_history_portfolio_sampling",
  });
}
