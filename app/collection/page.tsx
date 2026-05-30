"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";
import CINavigation from "../components/CINavigation";
import AddRecordSlideOver from "./AddRecordSlideOver";
import LiveMarketFeed from "../components/LiveMarketFeed";

type CollectionRecord = {
  id: number;
  artist: string | null;
  title: string | null;
  year: string | number | null;
  label: string | null;
  estimated_value: number | string | null;
  discogs_image_url: string | null;
  cover_url: string | null;
  market_momentum: string | null;
  demand_score: number | null;
  supply_pressure: number | null;
  volatility_score: number | null;
  collector_iq_score: number | null;
};

function numberValue(value: number | string | null | undefined) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(/[$,]/g, ""));

  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numberValue(value));
}

function score(value: number | null | undefined) {
  return Number(value || 0);
}

export default function CollectionPage() {
  const supabase = createClient();
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const [records, setRecords] = useState<CollectionRecord[]>([]);
  const [topEstimated, setTopEstimated] = useState<CollectionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [collectionCount, setCollectionCount] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  async function loadDashboard(currentUserId: string, searchTerm = "") {
    setLoading(true);

    try {
      let query = supabase
        .from("records_clean_safe")
        .select(
          `
          id,
          artist,
          title,
          year,
          label,
          estimated_value,
          discogs_image_url,
          cover_url,
          market_momentum,
          demand_score,
          supply_pressure,
          volatility_score,
          collector_iq_score
          `,
          { count: "exact" }
        )
        .eq("user_id", currentUserId)
        .order("id", { ascending: false })
        .limit(1000);

      if (searchTerm.trim()) {
        const term = searchTerm.trim();
        query = query.or(
          `artist.ilike.%${term}%,title.ilike.%${term}%,label.ilike.%${term}%`
        );
      }

      const { data, count, error } = await query;

      if (error) {
        console.error(error);
        setRecords([]);
        return;
      }

      const rows = (data || []) as CollectionRecord[];

      setRecords(rows);
      setCollectionCount(count || rows.length);
      setPortfolioValue(
        rows.reduce((sum, record) => sum + numberValue(record.estimated_value), 0)
      );

      setTopEstimated(
        [...rows]
          .filter((record) => numberValue(record.estimated_value) > 0)
          .sort(
            (a, b) =>
              numberValue(b.estimated_value) - numberValue(a.estimated_value)
          )
          .slice(0, 5)
      );

      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function initialize() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        console.error("User auth failed:", error);
        return;
      }

      setUserId(user.id);

      const savedQuery =
        sessionStorage.getItem("collector-search-query") || "";

      const savedRecent =
        sessionStorage.getItem("collector-search-history");

      if (savedRecent) {
        setRecentSearches(JSON.parse(savedRecent));
      }

      setSearchQuery(savedQuery);
      await loadDashboard(user.id, savedQuery);
    }

    initialize();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      loadDashboard(userId, searchQuery);
    }, 60000);

    return () => clearInterval(interval);
  }, [userId, searchQuery]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % 5);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  async function handleSearch() {
    const cleaned = searchQuery.trim();

    sessionStorage.setItem("collector-search-query", cleaned);

    const updated = [
      cleaned,
      ...recentSearches.filter(
        (item) => item.toLowerCase() !== cleaned.toLowerCase()
      ),
    ]
      .filter(Boolean)
      .slice(0, 8);

    setRecentSearches(updated);
    sessionStorage.setItem("collector-search-history", JSON.stringify(updated));

    if (userId) {
      await loadDashboard(userId, cleaned);
    }

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  }

  const displayedRecords = useMemo(() => {
    if (!showDuplicatesOnly) return records;

    const counts = new Map<string, number>();

    records.forEach((record) => {
      const key = `${record.artist}|${record.title}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return records.filter((record) => {
      const key = `${record.artist}|${record.title}`;
      return (counts.get(key) || 0) > 1;
    });
  }, [records, showDuplicatesOnly]);

  const hotMarketCount = records.filter((record) =>
    String(record.market_momentum || "").toLowerCase().includes("acceler")
  ).length;

  const tightSupplyCount = records.filter(
    (record) => score(record.supply_pressure) >= 50
  ).length;

  const buyWatchCount = records.filter(
    (record) => score(record.demand_score) >= 50
  ).length;

  const riskWatchCount = records.filter(
    (record) => score(record.volatility_score) >= 50
  ).length;

  const iqLeaderCount = records.filter(
    (record) => score(record.collector_iq_score) >= 100
  ).length;

  const enrichmentCoverage = useMemo(() => {
    if (!records.length) return 0;

    const enriched = records.filter(
      (record) => record.discogs_image_url || record.cover_url
    ).length;

    return Math.round((enriched / records.length) * 100);
  }, [records]);

  const avgValue = records.length
    ? portfolioValue / records.length
    : 0;

  const duplicateCount = useMemo(() => {
    const counts = new Map<string, number>();

    records.forEach((record) => {
      const key = `${record.artist}|${record.title}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return Array.from(counts.values()).filter((count) => count > 1).length;
  }, [records]);

  const tickerMessages = [
    `Portfolio Value ${money(portfolioValue)}`,
    `${collectionCount} Records Indexed`,
    `${hotMarketCount} Hot Market Signals`,
    `${riskWatchCount} Risk Watch Signals`,
    "Collector Intelligence Online",
  ];

  return (
    <main className="min-h-screen bg-[#050403] text-[#F4EFE6]">
      <CINavigation />

      <section className="mx-auto max-w-7xl px-6 py-8">
        <section className="relative overflow-hidden rounded-[38px] border border-[#352819] bg-gradient-to-br from-[#16110B] via-[#0C0A07] to-[#050403] p-8 shadow-[0_18px_80px_rgba(0,0,0,.55)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(199,164,93,.16),transparent_38%)]" />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="inline-flex rounded-full border border-[#D8B65A]/20 bg-[#D8B65A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.35em] text-[#E5C67A]">
                Collection Intelligence
              </p>

              <h1 className="mt-5 text-5xl font-black tracking-tight lg:text-7xl">
                Collection <span className="text-[#FFD21E]">Command</span>{" "}
                <span className="text-[#FF9D00]">Center</span>
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-7 text-[#B8AA96]">
                Live portfolio management, market signal monitoring, valuation
                intelligence, and archive operations from one command surface.
              </p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-black/30 p-6">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
                  Database Status
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  Connected
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8E8170]">
                  Latest Activity
                </p>
                <p className="mt-2 text-sm text-white">
                  {lastRefresh
                    ? `Updated ${lastRefresh.toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}`
                    : `Loaded ${collectionCount} records.`}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border border-[#3A2C18] bg-[#110D09] px-6 py-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[#D8B65A]" />
            <p className="text-xs uppercase tracking-[0.35em] text-[#8E8170]">
              Live Intelligence
            </p>
            <div className="text-sm font-semibold text-[#E7D4AE]">
              {tickerMessages[tickerIndex]}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[34px] border border-[#2E251B] bg-[linear-gradient(135deg,_#12100C,_#0A0907)] p-5 shadow-2xl">
          <LiveMarketFeed />
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-5">
          <SignalCard label="🔥 Hot Market" value={hotMarketCount} helper="Accelerating records" tone="orange" />
          <SignalCard label="⚡ Tight Supply" value={tightSupplyCount} helper="Supply pressure" tone="yellow" />
          <SignalCard label="🟢 Buy Watch" value={buyWatchCount} helper="Demand signals" tone="green" />
          <SignalCard label="🔴 Risk Watch" value={riskWatchCount} helper="Volatility signals" tone="red" />
          <SignalCard label="🧠 IQ Leaders" value={iqLeaderCount} helper="IQ 100+" tone="cyan" />
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <MetricCard label="Archive Size" value={String(collectionCount)} />
          <MetricCard label="Portfolio Value" value={money(portfolioValue)} accent />
          <MetricCard label="Enrichment" value={`${enrichmentCoverage}%`} />
          <MetricCard label="Avg Record Value" value={money(avgValue)} />
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <MetricCard label="Duplicates" value={String(duplicateCount)} />
          <MetricCard label="Value Leaders" value={String(topEstimated.length)} />
          <MetricCard label="CI Status" value="ONLINE" accent />
        </section>

        {topEstimated.length > 0 ? (
          <section className="mt-10">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#B48A4D]">
                  Market Signal Layer
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  Portfolio Market Leaders
                </h2>
              </div>

              <Link
                href="/collection/market-leaders"
                className="rounded-2xl border border-[#3A3025] bg-[#15110B] px-4 py-3 text-sm font-bold text-[#D8B65A]"
              >
                Full Market Ranking
              </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-5">
              {topEstimated.map((record, index) => (
                <Link
                  key={record.id}
                  href={`/collection/${record.id}`}
                  className="group overflow-hidden rounded-[32px] border border-[#2B2118] bg-gradient-to-br from-[#130F0B] to-[#090705] transition duration-300 hover:-translate-y-2 hover:border-[#D8B65A]/40"
                >
                  <div className="relative">
                    <img
                      src={
                        record.cover_url ||
                        record.discogs_image_url ||
                        "https://picsum.photos/500/500"
                      }
                      alt={record.title || "Record"}
                      className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105"
                    />

                    <div className="absolute left-3 top-3 rounded-full border border-[#D8B65A]/30 bg-black/60 px-3 py-1 text-[11px] font-black text-[#F3D28D]">
                      #{index + 1}
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-[#B48A4D]">
                      Market Leader
                    </p>
                    <p className="mt-2 line-clamp-2 text-lg font-black text-white">
                      {record.title}
                    </p>
                    <p className="mt-2 text-sm text-[#9D8E78]">
                      {record.artist}
                    </p>
                    <p className="mt-5 text-xl font-black text-[#E5C67A]">
                      {money(record.estimated_value)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-10 rounded-[34px] border border-[#32281D] bg-[#0F0C09] p-6 shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#D8B65A]">
                Archive Command Layer
              </p>
              <h2 className="mt-3 text-3xl font-black">
                Collection Operations
              </h2>
            </div>

            <AddRecordSlideOver
              showDuplicatesOnly={showDuplicatesOnly}
              setShowDuplicatesOnly={setShowDuplicatesOnly}
              duplicateCount={duplicateCount}
            />
          </div>

          <div className="mt-6 flex flex-col gap-4 lg:flex-row">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
              placeholder="Search artist, title, label, year..."
              className="h-16 flex-1 rounded-3xl border border-[#3A3025] bg-[#090705] px-6 text-white outline-none"
            />

            <button
              onClick={handleSearch}
              className="h-16 rounded-3xl bg-[#C7A45D] px-8 font-black text-black transition hover:bg-[#D8B86A]"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </section>

        <section ref={resultsRef} className="mt-10">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-3xl font-black">
              {displayedRecords.length} Records
            </h2>

            {searchQuery ? (
              <div className="text-sm text-[#8E8170]">
                Search: {searchQuery}
              </div>
            ) : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {displayedRecords.map((record) => (
              <Link
                key={record.id}
                href={`/collection/${record.id}`}
                className="overflow-hidden rounded-[30px] border border-[#2D241B] bg-gradient-to-br from-[#120F0C] to-[#090705] transition hover:-translate-y-1 hover:border-[#D0B06C]/30"
              >
                <div className="relative">
                  <img
                    src={
                      record.discogs_image_url ||
                      record.cover_url ||
                      "https://picsum.photos/500/500"
                    }
                    alt={record.title || "Record"}
                    className="aspect-square w-full object-cover"
                  />

                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    <div className="rounded-full bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-[#E7C980]">
                      Collection Asset
                    </div>

                    {numberValue(record.estimated_value) > avgValue ? (
                      <div className="rounded-full bg-[#D8B65A]/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-black">
                        Value Leader
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#B48A4D]">
                    {record.artist}
                  </p>

                  <p className="mt-2 text-2xl font-black text-white">
                    {record.title}
                  </p>

                  <p className="mt-2 text-sm text-[#A89782]">
                    {record.label} · {record.year}
                  </p>

                  <div className="mt-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase text-[#7B7061]">
                        Estimated Value
                      </p>
                      <p className="mt-1 text-lg font-black text-[#D8B65A]">
                        {money(record.estimated_value)}
                      </p>
                    </div>

                    <div className="rounded-full border border-[#3A3025] px-3 py-2 text-xs font-bold text-[#D8B65A]">
                      Open Profile
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function SignalCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  tone: "orange" | "yellow" | "green" | "red" | "cyan";
}) {
  const classes = {
    orange: "border-orange-500/20 bg-orange-500/[0.08] text-orange-200",
    yellow: "border-yellow-500/20 bg-yellow-500/[0.08] text-yellow-200",
    green: "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-200",
    red: "border-red-500/20 bg-red-500/[0.08] text-red-200",
    cyan: "border-cyan-500/20 bg-cyan-500/[0.08] text-cyan-200",
  };

  return (
    <div className={`rounded-[28px] border p-5 ${classes[tone]}`}>
      <p className="text-xs font-black uppercase tracking-[0.25em]">
        {label}
      </p>
      <p className="mt-3 text-4xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm text-[#B8AA96]">{helper}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[28px] border border-[#32281D] bg-[#100D09] p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-[#8E8170]">
        {label}
      </p>
      <p className={accent ? "mt-3 text-3xl font-black text-[#D8B65A]" : "mt-3 text-3xl font-black text-white"}>
        {value}
      </p>
    </div>
  );
}
