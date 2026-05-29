"use client";

import { useEffect, useState } from "react";

type FeedItem = {
  id: string;
  status: "LIVE" | "ALERT" | "TRENDING";
  color: "blue" | "green" | "orange" | "red";
  artist: string;
  title: string;
  message: string;
  change: number;
  timestamp?: string | null;
  source?: string;
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

function formatTime(timestamp?: string | null) {
  if (!timestamp) return "";

  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return "";
  }
}

export default function LiveMarketFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeed() {
      try {
        const response = await fetch("/api/market-feed", {
          cache: "no-store",
        });

        const data = await response.json();

        setFeed(data.feed || []);
      } catch (error) {
        console.error(
          "Failed to load market feed",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadFeed();

    const interval = setInterval(
      loadFeed,
      60000
    );

    return () =>
      clearInterval(interval);
  }, []);

  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Live Market Intelligence
          </h2>

          <p className="mt-1 text-sm text-zinc-400">
            Real collector movement and market signals
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
        <div className="max-h-[520px] overflow-y-auto space-y-4 pr-2">
          {feed.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.05]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-zinc-300">
                    <span>
                      {getStatusEmoji(item.color)}
                    </span>

                    <span>
                      {item.status}
                    </span>
                  </div>

                  <h3 className="mt-2 text-xl font-bold text-white">
                    {item.artist}
                    {" — "}
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm text-zinc-400">
                    {item.message}
                  </p>

                  {item.timestamp ? (
                    <p className="mt-3 text-xs text-zinc-500">
                      {formatTime(
                        item.timestamp
                      )}
                    </p>
                  ) : null}
                </div>

                <div
                  className={`rounded-xl px-3 py-2 text-lg font-bold ${
                    item.color === "red"
                      ? "bg-red-500/10 text-red-400"
                      : item.color ===
                        "orange"
                      ? "bg-orange-500/10 text-orange-300"
                      : item.color ===
                        "green"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-cyan-500/10 text-cyan-300"
                  }`}
                >
                  {item.message
                    .toLowerCase()
                    .includes(
                      "thin market"
                    )
                    ? `${item.change} left`
                    : `Spread ${item.change}%`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
