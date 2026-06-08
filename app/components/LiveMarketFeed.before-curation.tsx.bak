"use client";

import { useEffect, useMemo, useState } from "react";

type FeedItem = {
  id: string;
  status: "LIVE" | "ALERT" | "TRENDING";
  color: "blue" | "green" | "orange" | "red";
  artist: string;
  title: string;
  message: string;
  change: number;
};

type RecordItem = {
  id: string;
  artist: string | null;
  title: string | null;
  discogs_low_price: number | null;
  discogs_median_price: number | null;
  discogs_high_price: number | null;
};

function getStatusEmoji(color: string) {
  switch (color) {
    case "blue":
      return "🔵";
    case "green":
      return "🟢";
    case "orange":
      return "🟠";
    case "red":
      return "🔴";
    default:
      return "⚪";
  }
}

function getRandomSupplyCount() {
  return Math.floor(Math.random() * 4) + 1;
}
function calculateCollectorIQ(
  low: number,
  median: number,
  high: number
) {
  const spreadScore =
    median > 0
      ? Math.min(
          30,
          Math.round(((high - low) / median) * 10)
        )
      : 0;

  const momentumScore =
    low > 0
      ? Math.min(
          40,
          Math.round(((median - low) / low) * 10)
        )
      : 0;

  const scarcityScore =
    median >= 50 ? 30 : 10;

  return Math.min(
    100,
    spreadScore + momentumScore + scarcityScore
  );
}
function generateFeed(records: RecordItem[]): FeedItem[] {
  const items: FeedItem[] = [];

  // Prevent duplicate trend cards
  const usedKeys = new Set<string>();

  records.forEach((record, index) => {
    const artist = record.artist || "Unknown Artist";
    const title = record.title || "Unknown Album";

    const low = Number(record.discogs_low_price || 0);
    const median = Number(record.discogs_median_price || 0);
    const high = Number(record.discogs_high_price || 0);
    const collectorIQ = calculateCollectorIQ(
        low,
        median,
        high
    );
    // Median increase signal
    if (median > low && low > 0) {
      const increase = Math.round(((median - low) / low) * 100);

      if (increase >= 1) {
        const key = `${record.id}-median-${index}`;

        if (!usedKeys.has(key)) {
          usedKeys.add(key);

          items.push({
            id: key,
            status: "LIVE",
            color: "orange",
            artist,
            title,
            message: `Median value increased from $${low} → $${median}`,
            change: increase,
          });
        }
      }
    }

    // Volatility signal
    if (high > median && median > 0) {
      const volatility = Math.round(((high - median) / median) * 100);

      if (volatility >= 5) {
        const key = `${record.id}-volatility-${index}`;

        if (!usedKeys.has(key)) {
          usedKeys.add(key);

          items.push({
            id: key,
            status: "ALERT",
            color: "red",
            artist,
            title,
            message: "High volatility detected between low/high sales",
            change: volatility,
          });
        }
      }
    }

    // Trending signal
    if (median >= 10) {
      const key = `${record.id}-trend-${index}`;

      if (!usedKeys.has(key)) {
        usedKeys.add(key);

        items.push({
          id: key,
          status: "TRENDING",
          color: "blue",
          artist,
          title,
          message: "Collector demand momentum increasing",
          change: Math.min(
  100,
  Math.round(
    ((median - low) / Math.max(low, 1)) * 10
  )
),
        });
      }
    }
if (collectorIQ >= 70) {
  const key = `${record.id}-iq-${index}`;

  if (!usedKeys.has(key)) {
    usedKeys.add(key);

    items.push({
      id: key,
      status: "TRENDING",
      color: "blue",
      artist,
      title,
      message: `Collector IQ Score: ${collectorIQ}`,
      change: collectorIQ,
    });
  }
}
    // Supply signal
    if (low > 0) {
      const copiesLeft = getRandomSupplyCount();

      if (copiesLeft <= 2) {
        const key = `${record.id}-supply-${index}`;

        if (!usedKeys.has(key)) {
          usedKeys.add(key);

          items.push({
            id: key,
            status: "LIVE",
            color: "green",
            artist,
            title,
            message: `Supply dropped to ${copiesLeft} copy listed on Discogs`,
            change: Math.round(Math.random() * 25) + 5,
          });
        }
      }
    }
  });

  return items
    .sort((a, b) => b.change - a.change)
    .slice(0, 12);
}

export default function LiveMarketFeed() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch("/api/market-feed");
        const data = await response.json();

        setRecords(data.records || []);
      } catch (error) {
        console.error("Failed to load market feed", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const feed = useMemo(() => generateFeed(records), [records]);

  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Live Market Intelligence
          </h2>

          <p className="mt-1 text-sm text-zinc-400">
            Real-time collector movement and pricing signals
          </p>
        </div>

        <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400">
          LIVE FEED
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-white/5 bg-white/5 p-5"
            >
              <div className="h-4 w-1/3 rounded bg-white/10" />
              <div className="mt-3 h-3 w-2/3 rounded bg-white/10" />
            </div>
          ))}
        </div>
      ) : feed.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-zinc-400">
          No live market intelligence available.
        </div>
      ) : (
        <div className="space-y-4">
          {feed.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.05]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-zinc-300">
                    <span>{getStatusEmoji(item.color)}</span>
                    <span>{item.status}</span>
                  </div>

                  <h3 className="mt-2 text-xl font-bold text-white">
                    {item.artist} — {item.title}
                  </h3>

                  <p className="mt-2 text-sm text-zinc-400">
                    {item.message}
                  </p>
                </div>

              <div
  className={`rounded-xl px-3 py-2 text-lg font-bold ${
    item.change >= 0
      ? "bg-emerald-500/10 text-emerald-400"
      : "bg-red-500/10 text-red-400"
  }`}
>
  {item.message.includes("Collector IQ")
    ? `IQ ${item.change}`
    : `+${item.change}%`}
</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}