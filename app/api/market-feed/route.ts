import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("market_history")
    .select(`
      id,
      record_id,
      discogs_low_price,
      discogs_median_price,
      discogs_high_price,
      discogs_for_sale,
      market_signal,
      captured_at,
      records_clean_safe (
        artist,
        title
      )
    `)
    .order("captured_at", {
      ascending: false,
    })
    .limit(200);

  if (error) {
    console.error(
      "MARKET FEED ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }

  const seen = new Set();

  const diversified = (data || []).filter((row: any) => {
    const artist =
      row.records_clean_safe?.artist || "Unknown";

    const title =
      row.records_clean_safe?.title || "Unknown";

    const key = `${artist}-${title}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });

  const feed = diversified.slice(0, 40).map(
    (row: any, index: number) => {
      const artist =
        row.records_clean_safe?.artist ||
        "Unknown Artist";

      const title =
        row.records_clean_safe?.title ||
        "Unknown Title";

      const low =
        Number(row.discogs_low_price) || 0;

      const median =
        Number(row.discogs_median_price) || 0;

      const high =
        Number(row.discogs_high_price) || 0;

      const forSale =
        Number(row.discogs_for_sale) || 0;

      let color = "green";
      let status = "TRENDING";
      let message = "";

      if (
        String(row.market_signal)
          .toLowerCase()
          .includes("thin")
      ) {
        color = "orange";
        status = "ALERT";
        message = `${row.market_signal} · Thin market: ${forSale} listed`;
      } else if (high > median * 1.5) {
        color = "red";
        status = "ALERT";
        message = `${row.market_signal} · High spread: $${low} → $${median}`;
      } else {
        color = "green";
        status = "TRENDING";
        message = `${row.market_signal} · Market active`;
      }

      return {
        id: `history-${row.id}-${index}`,
        status,
        color,
        artist,
        title,
        message,
        change:
          high && median
            ? Math.round(
                ((high - median) /
                  Math.max(median, 1)) *
                  100
              )
            : 0,
        timestamp: row.captured_at,
        source: "market_history",
      };
    }
  );

  return NextResponse.json({
    feed,
    source: "market_history_diversified",
  });
}
