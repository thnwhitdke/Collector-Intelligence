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

export default function LiveMarketFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadFeed() {
    try {
      const response = await fetch(
        "/api/market-feed",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      setFeed(data.feed || []);
    } catch (error) {
      console.error(
        "Market feed failed",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFeed();

    const interval = setInterval(
      loadFeed,
      60000
    );

    return () =>
      clearInterval(interval);
  }, []);

  const tickerText = useMemo(() => {
    return feed
      .map(
        (item) =>
          `${item.artist} — ${item.title} · ${item.message}`
      )
      .join("   ✦   ");
  }, [feed]);

  const featured = feed.slice(0, 3);

  return (
    <section className="rounded-[32px] border border-[#2A2418] bg-[#0B0A08] p-5 shadow-2xl">

      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D8B65A]">
            Live Market Intelligence
          </p>

          <h2 className="mt-2 text-3xl font-black text-white">
            Collector Activity Feed
          </h2>
        </div>

        <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
          LIVE
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-emerald-500/10 bg-[#10100E]">
        <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />

          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">
            Market Ticker
          </p>

          <p className="text-xs text-zinc-500">
            Auto-refresh every 60 sec
          </p>
        </div>

        <div className="relative overflow-hidden py-3">
          {loading ? (
            <div className="px-4 text-sm text-zinc-500">
              Loading intelligence...
            </div>
          ) : (
            <div className="whitespace-nowrap animate-[ticker_45s_linear_infinite] px-4 text-sm text-zinc-300">
              {tickerText || "No market intelligence available"}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {featured.map((item) => (
          <div
            key={item.id}
            className="rounded-3xl border border-[#2A2418] bg-[#11100D] p-4"
          >
            <div className="flex items-center justify-between">
              <div
                className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]
                ${
                  item.color === "red"
                    ? "bg-red-500/10 text-red-300"
                    : item.color === "orange"
                    ? "bg-orange-500/10 text-orange-300"
                    : item.color === "green"
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-cyan-500/10 text-cyan-300"
                }`}
              >
                {item.status}
              </div>

              <div className="text-xs text-zinc-500">
                {item.timestamp
                  ? new Date(
                      item.timestamp
                    ).toLocaleTimeString()
                  : ""}
              </div>
            </div>

            <h3 className="mt-4 text-lg font-black text-white">
              {item.artist}
            </h3>

            <p className="text-sm text-zinc-400">
              {item.title}
            </p>

            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {item.message}
            </p>

            <div className="mt-4 inline-flex rounded-2xl border border-[#3A3020] bg-black/30 px-3 py-2 text-sm font-black text-[#D8B65A]">
              {item.message
                .toLowerCase()
                .includes("thin market")
                ? `${item.change} left`
                : `Spread ${item.change}%`}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </section>
  );
}
