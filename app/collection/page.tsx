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
  market_consensus_value: number | string | null;
  discogs_median_price: number | string | null;
  discogs_image_url: string | null;
  discogs_thumbnail_url?: string | null;
  cover_url: string | null;
  market_momentum?: string | null;
  demand_score?: number | null;
  supply_pressure?: number | null;
  volatility_score?: number | null;
  collector_iq_score?: number | null;
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

function consensusValue(record: Pick<CollectionRecord, "market_consensus_value" | "estimated_value" | "discogs_median_price">) {
  const marketConsensus = numberValue(record.market_consensus_value);
  const estimated = numberValue(record.estimated_value);
  const discogsMedian = numberValue(record.discogs_median_price);

  if (marketConsensus > 0) return marketConsensus;
  if (estimated > 0) return estimated;
  if (discogsMedian > 0) return discogsMedian;

  return 0;
}

function score(value: number | null | undefined) {
  return Number(value || 0);
}

function coverFor(record: CollectionRecord) {
  return (
    record.cover_url ||
    record.discogs_image_url ||
    record.discogs_thumbnail_url ||
    ""
  );
}

export default function CollectionPage() {
  const supabase = createClient();
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const [collectionRecords, setCollectionRecords] = useState<CollectionRecord[]>([]);
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
  const [feedCounts, setFeedCounts] = useState({
    hot: 0,
    supply: 0,
    buy: 0,
    risk: 0,
    iq: 0,
  });
  const [latestSignalAt, setLatestSignalAt] = useState<string | null>(null);
  const [signalFilter, setSignalFilter] = useState<
    "all" | "hot" | "supply" | "buy" | "risk" | "iq"
  >("all");

  useEffect(() => {
    async function loadMarketFeedSummary() {
      try {
        const response = await fetch("/api/market-feed", {
          cache: "no-store",
        });

        const data = await response.json();

        if (data.signalCounts) {
          setFeedCounts(data.signalCounts);
        }

        if (data.latestSignalAt) {
          setLatestSignalAt(data.latestSignalAt);
        }
      } catch (error) {
        console.error("Market feed summary failed:", error);
      }
    }

    loadMarketFeedSummary();
  }, []);

  async function loadCollectionMetrics(currentUserId: string) {
    try {
      const { count } = await supabase
        .from("records_clean_safe")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("user_id", currentUserId);

      setCollectionCount(count || 0);

      const { data: values } = await supabase
        .from("records_clean_safe")
        .select("market_consensus_value, estimated_value, discogs_median_price")
        .eq("user_id", currentUserId);

      const total =
        values?.reduce(
          (sum, item) => sum + consensusValue(item as CollectionRecord),
          0,
        ) || 0;

      setPortfolioValue(total);

      const { data: leaders } = await supabase
        .from("records_clean_safe")
        .select(`
          id,
          artist,
          title,
          year,
          label,
          estimated_value,
          market_consensus_value,
          discogs_median_price,
          discogs_image_url,
          discogs_thumbnail_url,
          cover_url,
          market_momentum,
          demand_score,
          supply_pressure,
          volatility_score,
          collector_iq_score
        `)
        .eq("user_id", currentUserId)
        .not("market_consensus_value", "is", null)
        .order("market_consensus_value", {
          ascending: false,
          nullsFirst: false,
        })
        .limit(5);

      setTopEstimated((leaders || []) as CollectionRecord[]);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    }
  }

  async function searchCollection(searchTerm: string, currentUserId?: string) {
    try {
      setLoading(true);

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
          market_consensus_value,
          discogs_median_price,
          discogs_image_url,
          discogs_thumbnail_url,
          cover_url,
          market_momentum,
          demand_score,
          supply_pressure,
          volatility_score,
          collector_iq_score
          `,
          {
            count: "exact",
          },
        )
        .eq("user_id", currentUserId || userId || "")
        .order("id", {
          ascending: false,
        })
        .limit(1000);

      if (searchTerm.trim()) {
        const term = searchTerm.trim();

        query = query.or(
          `artist.ilike.%${term}%,title.ilike.%${term}%,label.ilike.%${term}%`,
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error(error);
        setCollectionRecords([]);
        return;
      }

      setCollectionRecords((data || []) as CollectionRecord[]);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
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

      await loadCollectionMetrics(user.id);

      const savedQuery = sessionStorage.getItem("collector-search-query");
      const savedRecent = sessionStorage.getItem("collector-search-history");

      if (savedRecent) {
        setRecentSearches(JSON.parse(savedRecent));
      }

      if (savedQuery) {
        setSearchQuery(savedQuery);
        await searchCollection(savedQuery, user.id);
      } else {
        await searchCollection("", user.id);
      }
    }

    initialize();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(async () => {
      await loadCollectionMetrics(userId);
      await searchCollection(searchQuery, userId);
    }, 60000);

    return () => clearInterval(interval);
  }, [userId, searchQuery]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % 5);
    }, 4200);

    return () => clearInterval(interval);
  }, []);

  async function handleSearch() {
    const cleaned = searchQuery.trim();

    sessionStorage.setItem("collector-search-query", cleaned);

    const updated = [
      cleaned,
      ...recentSearches.filter(
        (s) => s.toLowerCase() !== cleaned.toLowerCase(),
      ),
    ]
      .filter(Boolean)
      .slice(0, 8);

    setRecentSearches(updated);

    sessionStorage.setItem(
      "collector-search-history",
      JSON.stringify(updated),
    );

    await searchCollection(cleaned, userId || undefined);

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  }

  const displayedRecords = useMemo(() => {
    let filtered = collectionRecords;

    if (signalFilter === "hot") {
      filtered = filtered.filter((record) =>
        String(record.market_momentum || "").toLowerCase().includes("acceler"),
      );
    }

    if (signalFilter === "supply") {
      filtered = filtered.filter((record) => score(record.supply_pressure) >= 50);
    }

    if (signalFilter === "buy") {
      filtered = filtered.filter((record) => score(record.demand_score) >= 50);
    }

    if (signalFilter === "risk") {
      filtered = filtered.filter((record) => score(record.volatility_score) >= 50);
    }

    if (signalFilter === "iq") {
      filtered = filtered.filter((record) => score(record.collector_iq_score) >= 100);
    }

    if (!showDuplicatesOnly) return filtered;

    const counts = new Map<string, number>();

    filtered.forEach((record) => {
      const key = `${record.artist}|${record.title}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return filtered.filter((record) => {
      const key = `${record.artist}|${record.title}`;
      return (counts.get(key) || 0) > 1;
    });
  }, [collectionRecords, showDuplicatesOnly, signalFilter]);

  const enrichmentCoverage = useMemo(() => {
    if (!collectionRecords.length) return 0;

    const enriched = collectionRecords.filter((r) => coverFor(r)).length;

    return Math.round((enriched / collectionRecords.length) * 100);
  }, [collectionRecords]);

  const avgValue = useMemo(() => {
    if (!collectionRecords.length) return 0;

    return (
      collectionRecords.reduce(
        (sum, r) => sum + consensusValue(r),
        0,
      ) / collectionRecords.length
    );
  }, [collectionRecords]);

  const duplicateCount = useMemo(() => {
    const counts = new Map<string, number>();

    collectionRecords.forEach((record) => {
      const key = `${record.artist}|${record.title}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return Array.from(counts.values()).filter((c) => c > 1).length;
  }, [collectionRecords]);

  const hotMarketCount = feedCounts.hot;
  const tightSupplyCount = feedCounts.supply;
  const buyWatchCount = feedCounts.buy;
  const riskWatchCount = feedCounts.risk;
  const iqLeaderCount = feedCounts.iq;

  const tickerMessages = [
    `Portfolio Value ${money(portfolioValue)}`,
    `${collectionCount} Records Indexed`,
    `${topEstimated.length} Value Leaders Active`,
    `${enrichmentCoverage}% Cover Intelligence`,
    `Collector Intelligence Online`,
  ];

  return (
    <main className="min-h-screen bg-[#050403] text-[#F4EFE6]">
      <CINavigation />

      <section className="mx-auto max-w-7xl px-6 py-8">
        <section className="relative overflow-hidden rounded-[42px] border border-[#3A2A14] bg-[radial-gradient(circle_at_top_left,rgba(255,210,30,0.16),transparent_34%),linear-gradient(135deg,#170F08,#080604_52%,#120A05)] p-8 shadow-[0_24px_100px_rgba(0,0,0,.68)]">
          <div className="absolute right-[-80px] top-[-90px] h-72 w-72 rounded-full bg-[#D8B65A]/10 blur-3xl" />
          <div className="absolute bottom-[-120px] left-[35%] h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
            <div>
              <div className="inline-flex rounded-full border border-[#D8B65A]/25 bg-[#D8B65A]/10 px-5 py-2 text-[11px] font-black uppercase tracking-[0.35em] text-[#F4CD68]">
                Collector Intelligence OS
              </div>

              <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.92] tracking-tight md:text-7xl">
                Collection{" "}
                <span className="text-[#FFD21E]">Archive</span>
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-7 text-[#B8AA96]">
                A luxury-grade intelligence layer for searching, managing,
                repairing, valuing, and understanding your private music archive.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/collection/value-dashboard"
                  className="rounded-2xl border border-[#D8B65A]/25 bg-[#D8B65A]/10 px-5 py-3 text-sm font-black text-[#F4CD68] transition hover:bg-[#D8B65A]/20"
                >
                  Portfolio Intelligence
                </Link>

                <Link
                  href="/collection/market-intelligence"
                  className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/10 px-5 py-3 text-sm font-black text-fuchsia-100 transition hover:bg-fuchsia-500/20"
                >
                  Market Intelligence
                </Link>

                <Link
                  href="/collection/track-intelligence"
                  className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-500/20"
                >
                  Track Intelligence
                </Link>
              </div>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-black/35 p-5 shadow-2xl backdrop-blur-xl">
              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
                  Database Status
                </p>

                <p className="mt-2 text-3xl font-black text-white">
                  Connected
                </p>
              </div>

              <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8E8170]">
                  Latest Activity
                </p>

                <p className="mt-2 text-sm font-bold text-white">
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

            <div className="text-sm font-black text-[#E7D4AE]">
              {tickerMessages[tickerIndex]}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-5">
          <SignalCard
            label="🔥 Hot Market"
            value={hotMarketCount}
            helper="Accelerating records"
            tone="orange"
            active={signalFilter === "hot"}
            onClick={() => setSignalFilter(signalFilter === "hot" ? "all" : "hot")}
          />

          <SignalCard
            label="⚡ Tight Supply"
            value={tightSupplyCount}
            helper="Supply pressure"
            tone="yellow"
            active={signalFilter === "supply"}
            onClick={() => setSignalFilter(signalFilter === "supply" ? "all" : "supply")}
          />

          <SignalCard
            label="🟢 Buy Watch"
            value={buyWatchCount}
            helper="Demand signals"
            tone="green"
            active={signalFilter === "buy"}
            onClick={() => setSignalFilter(signalFilter === "buy" ? "all" : "buy")}
          />

          <SignalCard
            label="🔴 Risk Watch"
            value={riskWatchCount}
            helper="Volatility signals"
            tone="red"
            active={signalFilter === "risk"}
            onClick={() => setSignalFilter(signalFilter === "risk" ? "all" : "risk")}
          />

          <SignalCard
            label="🧠 IQ Leaders"
            value={iqLeaderCount}
            helper="IQ 100+"
            tone="cyan"
            active={signalFilter === "iq"}
            onClick={() => setSignalFilter(signalFilter === "iq" ? "all" : "iq")}
          />
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <MetricCard label="Archive Size" value={String(collectionCount)} />
          <MetricCard label="Portfolio Value" value={money(portfolioValue)} accent />
          <MetricCard label="Cover Intelligence" value={`${enrichmentCoverage}%`} />
          <MetricCard label="Avg Record Value" value={money(avgValue)} />
        </section>

        <section className="mt-8 rounded-[34px] border border-[#2E251B] bg-[linear-gradient(135deg,_#12100C,_#0A0907)] p-5 shadow-2xl">
          <LiveMarketFeed />
        </section>

        <section className="mt-10 rounded-[36px] border border-[#32281D] bg-[#0F0C09] p-6 shadow-2xl">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#D8B65A]">
                Archive Command Layer
              </p>

              <h2 className="mt-3 text-3xl font-black">
                Collection Operations
              </h2>

              <p className="mt-2 text-sm text-[#8E8170]">
                Search, filter duplicates, add records, and open full intelligence profiles.
              </p>
            </div>

            <AddRecordSlideOver
              showDuplicatesOnly={showDuplicatesOnly}
              setShowDuplicatesOnly={setShowDuplicatesOnly}
              duplicateCount={duplicateCount}
            />
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_auto]">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Search artist, title, label, year..."
              className="h-16 rounded-3xl border border-[#3A3025] bg-[#090705] px-6 text-white outline-none placeholder:text-[#756A5B] focus:border-[#D8B65A]/50"
            />

            <button
              onClick={handleSearch}
              className="h-16 rounded-3xl bg-[#C7A45D] px-10 font-black text-black transition hover:bg-[#D8B86A]"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          {recentSearches.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  onClick={async () => {
                    setSearchQuery(item);
                    await searchCollection(item, userId || undefined);
                  }}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-[#B8AA96] transition hover:border-[#D8B65A]/30 hover:text-[#D8B65A]"
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}
        </section>

                <section ref={resultsRef} className="mt-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#B48A4D]">
                Collection Registry
              </p>

              <h2 className="mt-2 text-4xl font-black">
                {displayedRecords.length} Records
              </h2>
            </div>

            {searchQuery ? (
              <div className="rounded-full border border-[#3A3025] bg-[#100D09] px-4 py-2 text-sm text-[#8E8170]">
                Search: {searchQuery}
              </div>
            ) : null}
          </div>

          {displayedRecords.length === 0 ? (
            <div className="overflow-hidden rounded-[40px] border border-[#32281D] bg-gradient-to-br from-[#14100B] via-[#0B0806] to-[#17110A] p-10 shadow-2xl">
              <div className="max-w-4xl">
                <div className="inline-flex rounded-full border border-[#D8B65A]/25 bg-[#D8B65A]/10 px-5 py-2 text-[11px] font-black uppercase tracking-[0.3em] text-[#F4CD68]">
                  Welcome To Collector Intelligence
                </div>

                <h2 className="mt-6 text-5xl font-black leading-tight">
                  Let&apos;s Build Your Archive
                </h2>

                <p className="mt-5 max-w-3xl text-lg leading-8 text-[#B8AA96]">
                  Your collection is currently empty. Once records are added,
                  Collector Intelligence will begin generating portfolio metrics,
                  market signals, rarity intelligence, valuation insights, and
                  collection analytics automatically.
                </p>

                <div className="mt-10 grid gap-5 md:grid-cols-3">
                  <div className="rounded-[28px] border border-[#2D241B] bg-black/25 p-6">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#D8B65A]">
                      Step 1
                    </p>

                    <h3 className="mt-3 text-xl font-black">
                      Add Your First Record
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-[#A89782]">
                      Start building your archive one record at a time using the Add
                      Record workflow.
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-[#2D241B] bg-black/25 p-6">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                      Step 2
                    </p>

                    <h3 className="mt-3 text-xl font-black">
                      Enrichment Activates
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-[#A89782]">
                      Metadata, artwork, market values, tracks, and intelligence
                      signals begin populating automatically.
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-[#2D241B] bg-black/25 p-6">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-fuchsia-300">
                      Step 3
                    </p>

                    <h3 className="mt-3 text-xl font-black">
                      Unlock Intelligence
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-[#A89782]">
                      Portfolio analytics, market intelligence, rarity detection,
                      and collection insights become available.
                    </p>
                  </div>
                </div>

                <div className="mt-10 flex flex-wrap gap-4">
                  <div className="rounded-2xl border border-[#D8B65A]/25 bg-[#D8B65A]/10 px-5 py-3 text-sm font-black text-[#F4CD68]">
                    Use Add Record Above To Begin
                  </div>

                  <Link
                    href="/collection/daily-briefing"
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.06]"
                  >
                    Explore The Platform
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {displayedRecords.map((record) => (
                <Link
                  key={record.id}
                  href={`/collection/${record.id}`}
                  className="group overflow-hidden rounded-[34px] border border-[#2D241B] bg-gradient-to-br from-[#140F0B] via-[#0B0806] to-[#17110A] shadow-2xl shadow-black/40 transition duration-300 hover:-translate-y-1 hover:border-[#D0B06C]/35"
                >
                  <CoverImage record={record} large />

                  <div className="p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-[#B48A4D]">
                      {record.artist || "Unknown Artist"}
                    </p>

                    <p className="mt-2 line-clamp-2 text-2xl font-black text-white">
                      {record.title || "Untitled"}
                    </p>

                    <p className="mt-2 text-sm text-[#A89782]">
                      {[record.label, record.year].filter(Boolean).join(" · ") ||
                        "Release details pending"}
                    </p>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <MiniStat label="Consensus" value={money(consensusValue(record))} />
                      <MiniStat label="Supply" value={String(score(record.supply_pressure) || "—")} />
                      <MiniStat label="Risk" value={String(score(record.volatility_score) || "—")} />
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <div className="rounded-full border border-[#3A3025] bg-black/30 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#D8B65A]">
                        Intelligence Profile
                      </div>

                      <div className="text-sm font-black text-[#E5C67A]">
                        Open →
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function CoverImage({
  record,
  large = false,
}: {
  record: CollectionRecord;
  large?: boolean;
}) {
  const src = coverFor(record);

  return (
    <div className="relative overflow-hidden bg-[#100D09]">
      {src ? (
        <img
          src={src}
          alt={record.title || "Record"}
          className={`w-full object-cover transition duration-500 group-hover:scale-105 ${
            large ? "aspect-square" : "aspect-square"
          }`}
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(216,182,90,0.14),transparent_45%),linear-gradient(135deg,#19120A,#070504)]">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#D8B65A]">
              Cover Repair
            </p>
            <p className="mt-2 text-sm text-[#8E8170]">
              Awaiting enrichment
            </p>
          </div>
        </div>
      )}

      <div className="absolute left-3 top-3 rounded-full border border-[#D8B65A]/30 bg-black/65 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-[#F3D28D]">
        Collection Asset
      </div>
    </div>
  );
}

function SignalCard({
  label,
  value,
  helper,
  tone,
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  helper: string;
  tone: "orange" | "yellow" | "green" | "red" | "cyan";
  active?: boolean;
  onClick?: () => void;
}) {
  const classes = {
    orange: "border-orange-500/20 bg-orange-500/[0.08] text-orange-200",
    yellow: "border-yellow-500/20 bg-yellow-500/[0.08] text-yellow-200",
    green: "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-200",
    red: "border-red-500/20 bg-red-500/[0.08] text-red-200",
    cyan: "border-cyan-500/20 bg-cyan-500/[0.08] text-cyan-200",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[28px] border p-5 text-left transition hover:-translate-y-1 hover:border-[#D8B65A]/40 ${
        classes[tone]
      } ${active ? "ring-2 ring-[#D8B65A]/50" : ""}`}
    >
      <p className="text-xs font-black uppercase tracking-[0.22em]">
        {label}
      </p>

      <p className="mt-3 text-4xl font-black text-white">
        {value}
      </p>

      <p className="mt-2 text-sm text-[#B8AA96]">
        {active ? "Filtered view active" : helper}
      </p>
    </button>
  );
}

function MetricCard({
  label,
  value,
  accent = false,
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

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#2D241B] bg-black/25 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#7B7061]">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black text-white">
        {value}
      </p>
    </div>
  );
}
