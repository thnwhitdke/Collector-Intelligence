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
  timestamp?: string | null;
};

function getSignalLabel(item: FeedItem) {
  const text = item.message.toLowerCase();

  if (text.includes("thin market")) return "Thin Market";
  if (text.includes("volatile")) return "Volatile";
  if (text.includes("high spread")) return "Wide Spread";
  if (item.status === "TRENDING") return "Trending";

  return "Live Signal";
}

function getColorClasses(color: FeedItem["color"]) {
  switch (color) {
    case "red":
      return {
        pill: "border-red-400/20 bg-red-500/10 text-red-300",
        dot: "bg-red-400",
        glow: "shadow-[0_0_22px_rgba(248,113,113,0.08)]",
      };
    case "orange":
      return {
        pill: "border-orange-400/20 bg-orange-500/10 text-orange-300",
        dot: "bg-orange-400",
        glow: "shadow-[0_0_22px_rgba(251,146,60,0.08)]",
      };
    case "green":
      return {
        pill: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
        dot: "bg-emerald-400",
        glow: "shadow-[0_0_22px_rgba(52,211,153,0.08)]",
      };
    default:
      return {
        pill: "border-cyan-400/20 bg-cyan-500/10 text-cyan-300",
        dot: "bg-cyan-400",
        glow: "shadow-[0_0_22px_rgba(34,211,238,0.08)]",
      };
  }
}

function formatTime(timestamp?: string | null) {
  if (!timestamp) return "Waiting for sync";

  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Waiting for sync";
  }
}

function formatDateTime(timestamp?: string | null) {
  if (!timestamp) return "Market sync pending";

  try {
    return new Date(timestamp).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Market sync pending";
  }
}

export default function LiveMarketFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rotationIndex, setRotationIndex] = useState(0);

  async function loadFeed() {
    setRefreshing(true);

    try {
      const response = await fetch("/api/market-feed", {
        cache: "no-store",
      });

      const data = await response.json();

      setFeed(data.feed || []);
      setLastRefresh(new Date());
      setRotationIndex((current) => current + 1);
    } catch (error) {
      console.error("Market feed failed", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadFeed();

    const interval = setInterval(loadFeed, 60000);

    return () => clearInterval(interval);
  }, []);

  const featured = (() => {
    if (feed.length <= 3) return feed;

    const sorted = [...feed];

    const offset = rotationIndex % sorted.length;
    const rotated = [
      ...sorted.slice(offset),
      ...sorted.slice(0, offset),
    ];

    const thin = rotated.find((item) =>
      item.message.toLowerCase().includes("thin market")
    );

    const volatile = rotated.find((item) =>
      item.message.toLowerCase().includes("volatile") ||
      item.message.toLowerCase().includes("spread")
    );

    const recent = rotated.find(
      (item) =>
        item.id !== thin?.id &&
        item.id !== volatile?.id
    );

    const fallback = rotated.filter(
      (item) =>
        item.id !== thin?.id &&
        item.id !== volatile?.id &&
        item.id !== recent?.id
    );

    return [thin, volatile, recent, ...fallback]
      .filter((item): item is FeedItem => Boolean(item))
      .slice(0, 3);
  })();

  const latestTimestamp = feed[0]?.timestamp ?? null;

  const tickerItems = useMemo(() => {
    return feed.slice(0, 8);
  }, [feed]);

  return (
    <section className="rounded-[32px] border border-[#2A2418] bg-[#0B0A08] p-5 shadow-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D8B65A]">
            Live Market Intelligence
          </p>

          <h2 className="mt-2 text-3xl font-black text-white">
            Collector Activity Feed
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Last market signal: {formatDateTime(latestTimestamp)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
            Auto-refresh 60s
          </div>

          <button
            onClick={loadFeed}
            disabled={refreshing}
            className="rounded-full border border-[#3A3020] bg-black/30 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#D8B65A] transition hover:border-[#D8B65A]/40 disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-emerald-500/10 bg-[#10100E]">
        <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">
            Market Ticker
          </p>

          <p className="text-xs text-zinc-500">
            Page refreshed:{" "}
            {lastRefresh
              ? lastRefresh.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "loading"}
          </p>
        </div>

        <div className="relative overflow-hidden py-3">
          {loading ? (
            <div className="px-4 text-sm text-zinc-500">
              Loading intelligence...
            </div>
          ) : tickerItems.length === 0 ? (
            <div className="px-4 text-sm text-zinc-500">
              No market intelligence available.
            </div>
          ) : (
            <div className="flex w-max animate-[ticker_55s_linear_infinite] items-center gap-4 px-4">
              {[...tickerItems, ...tickerItems].map((item, index) => {
                const classes = getColorClasses(item.color);

                return (
                  <div
                    key={`${item.id}-${index}`}
                    className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 text-sm ${classes.pill}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${classes.dot}`} />
                    <span className="font-black uppercase tracking-[0.18em]">
                      {getSignalLabel(item)}
                    </span>
                    <span className="text-zinc-300">
                      {item.artist} — {item.title}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {featured.map((item) => {
          const classes = getColorClasses(item.color);
          const label = getSignalLabel(item);

          return (
            <div
              key={item.id}
              className={`rounded-3xl border border-[#2A2418] bg-[#11100D] p-4 ${classes.glow}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div
                  className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${classes.pill}`}
                >
                  {label}
                </div>

                <div className="text-xs text-zinc-500">
                  {formatTime(item.timestamp)}
                </div>
              </div>

              <h3 className="mt-4 text-lg font-black text-white">
                {item.artist}
              </h3>

              <p className="text-sm text-zinc-400">{item.title}</p>

              <p className="mt-3 text-sm leading-6 text-zinc-300">
                {item.message}
              </p>

              <div className="mt-4 text-xs uppercase tracking-[0.18em] text-zinc-500">
                {item.message.toLowerCase().includes("thin market")
                  ? "Supply constraint"
                  : "Price spread signal"}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  );
}
