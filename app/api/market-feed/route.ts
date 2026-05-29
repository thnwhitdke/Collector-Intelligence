import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

function toNumber(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(/[$,]/g, ""));

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(
    () => Math.random() - 0.5
  );
}

export async function GET() {
  const supabase =
    createAdminClient();

  const { data: historyRows, error } =
    await supabase
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
      .order(
        "captured_at",
        { ascending: false }
      )
      .limit(300);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const ids = Array.from(
    new Set(
      (historyRows ?? [])
        .map((r) =>
          String(r.record_id)
        )
        .filter(Boolean)
    )
  );

  const { data: records } =
    ids.length
      ? await supabase
          .from(
            "records_clean_safe"
          )
          .select(`
            id,
            artist,
            title,
            rarity_score,
            estimated_value
          `)
          .in("id", ids)
      : { data: [] };

  const recordMap =
    new Map(
      (records ?? []).map(
        (r) => [
          String(r.id),
          r,
        ]
      )
    );

  const now = Date.now();

  const scored =
    (historyRows ?? []).map(
      (row) => {
        const record =
          recordMap.get(
            String(
              row.record_id
            )
          );

        const artist =
          record?.artist ??
          "Unknown Artist";

        const title =
          record?.title ??
          `Record ${row.record_id}`;

        const rarity =
          toNumber(
            record?.rarity_score
          );

        const value =
          toNumber(
            record?.estimated_value
          );

        const low =
          toNumber(
            row.discogs_low_price
          );

        const median =
          toNumber(
            row.discogs_median_price
          );

        const high =
          toNumber(
            row.discogs_high_price
          );

        const forSale =
          toNumber(
            row.discogs_for_sale
          );

        const ageHours =
          (
            now -
            new Date(
              row.captured_at
            ).getTime()
          ) /
          1000 /
          60 /
          60;

        let status =
          "LIVE";

        let color =
          "blue";

        let message =
          row.market_signal ||
          "Market signal";

        let score = 0;
        let change = 0;

        if (
          forSale <= 2
        ) {
          score += 35;
          color = "orange";
          status = "ALERT";
          message =
            `${message} · Thin market: ${forSale} listed`;
        }

        if (
          high > median &&
          median > 0
        ) {
          score += 25;
          color = "red";
          status = "ALERT";

          change =
            Math.round(
              (
                (high -
                  median) /
                median
              ) *
                100
            );

          message =
            `${message} · Spread $${median} → $${high}`;
        }

        score +=
          rarity * 0.5;

        score +=
          Math.min(
            value / 25,
            20
          );

        score +=
          Math.max(
            0,
            24 -
              ageHours
          );

        score +=
          Math.random() * 8;

        return {
          id:
            `history-${row.id}`,
          artist,
          title,
          rarity,
          value,
          status,
          color,
          message,
          change,
          score,
          timestamp:
            row.captured_at,
        };
      }
    );

  const deduped = [];
  const seen =
    new Set();

  for (
    const item of shuffle(
      scored
    )
  ) {
    const key =
      `${item.artist}-${item.title}`
        .toLowerCase();

    if (
      seen.has(key)
    )
      continue;

    seen.add(key);
    deduped.push(item);
  }

  deduped.sort(
    (a, b) =>
      b.score -
      a.score
  );

  return NextResponse.json({
    feed:
      deduped.slice(
        0,
        40
      ),
    source:
      "market_feed_v3_weighted",
  });
}
