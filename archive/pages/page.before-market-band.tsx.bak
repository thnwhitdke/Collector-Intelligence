// app/collection/page.tsx
// FULL PREMIUM COLLECTION PAGE REPLACEMENT

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";
import CINavigation from "../components/CINavigation";
import AddRecordSlideOver from "./AddRecordSlideOver";

import AutoRefresh from "../components/AutoRefresh";
import MarketTicker from "../components/MarketTicker";
import LiveMarketFeed from "../components/LiveMarketFeed";


type CollectionRecord = {
  id: number;
  artist: string | null;
  title: string | null;
  year: string | null;
  label: string | null;
  estimated_value: number | null;
  discogs_image_url: string | null;
};

function money(value: number | null | undefined) {
  if (!value || Number.isNaN(value)) return "$0";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CollectionPage() {
  const supabase = createClient();
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const [collectionRecords, setCollectionRecords] = useState<
    CollectionRecord[]
  >([]);

  const [topEstimated, setTopEstimated] = useState<
    CollectionRecord[]
  >([]);

  const [loading, setLoading] = useState(false);

  const [collectionCount, setCollectionCount] =
    useState(0);

  const [portfolioValue, setPortfolioValue] =
    useState(0);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [recentSearches, setRecentSearches] =
    useState<string[]>([]);

  const [showDuplicatesOnly, setShowDuplicatesOnly] =
    useState(false);

  const [tickerIndex, setTickerIndex] =
    useState(0);

  const [userId, setUserId] =
    useState<string | null>(null);

  async function loadCollectionMetrics(
  currentUserId: string,
) {
    try {
      const { count } = await supabase
        .from("records_clean_safe")
.select("*", {
  count: "exact",
  head: true,
})
.eq(
  "user_id",
  currentUserId,
);

      setCollectionCount(count || 0);

      const { data: values } = await supabase
        .from("records_clean_safe")
.select("estimated_value")
.eq(
  "user_id",
  currentUserId,
);

      const total =
        values?.reduce(
          (sum, item) =>
            sum +
            Number(
              item.estimated_value || 0,
            ),
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
    discogs_image_url
  `)
  .eq(
    "user_id",
    currentUserId,
  )
  .not(
    "estimated_value",
    "is",
    null,
  )
  .order("estimated_value", {
    ascending: false,
  })
  .limit(5);

      setTopEstimated(
        (leaders || []) as CollectionRecord[],
      );
    } catch (e) {
      console.error(e);
    }
  }

async function searchCollection(
  searchTerm: string,
  currentUserId?: string,
) {
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
    discogs_image_url
    `,
    {
      count: "exact",
    },
  )
  .eq(
    "user_id",
    currentUserId ||
      userId ||
      "",
  )
  .order("id", {
    ascending: false,
  })
  .limit(1000);

      if (searchTerm.trim()) {
        const term =
          searchTerm.trim();

        query = query.or(
          `artist.ilike.%${term}%,title.ilike.%${term}%,label.ilike.%${term}%`,
        );
      }

      const {
        data,
        error,
        count,
      } = await query;

      if (error) {
        console.error(error);
        setCollectionRecords([]);
        return;
      }

      setCollectionRecords(
        (data || []) as CollectionRecord[],
      );

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
        console.error("User auth failed:", error,
        );
        return;  
      }
      setUserId(user.id);

await loadCollectionMetrics(
  user.id,
);

      const savedQuery =
        sessionStorage.getItem(
          "collector-search-query",
        );

      const savedRecent =
        sessionStorage.getItem(
          "collector-search-history",
        );

      if (savedRecent) {
        setRecentSearches(
          JSON.parse(savedRecent),
        );
      }

      if (savedQuery) {
        setSearchQuery(savedQuery);
       await searchCollection(
  savedQuery,
  user.id,
);
      } else {
        await searchCollection(
  "",
  user.id,
);
      }
    }

    initialize();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(async () => {
      console.log("CI live refresh...");

      await loadCollectionMetrics(userId);

      await searchCollection(
        searchQuery,
        userId,
      );
    }, 60000);

    return () => clearInterval(interval);
  }, [
    userId,
    searchQuery,
  ]);

  async function handleSearch() {
    const cleaned =
      searchQuery.trim();

    sessionStorage.setItem(
      "collector-search-query",
      cleaned,
    );

    const updated = [
      cleaned,
      ...recentSearches.filter(
        (s) =>
          s.toLowerCase() !==
          cleaned.toLowerCase(),
      ),
    ]
      .filter(Boolean)
      .slice(0, 8);

    setRecentSearches(updated);

    sessionStorage.setItem(
      "collector-search-history",
      JSON.stringify(updated),
    );

   await searchCollection(
  cleaned,
  userId || undefined,
);

    setTimeout(() => {
      resultsRef.current?.scrollIntoView(
        {
          behavior: "smooth",
          block: "start",
        },
      );
    }, 120);
  }

  const displayedRecords =
    useMemo(() => {
      if (!showDuplicatesOnly) {
        return collectionRecords;
      }

      const counts =
        new Map<string, number>();

      collectionRecords.forEach(
        (record) => {
          const key = `${record.artist}|${record.title}`;
          counts.set(
            key,
            (counts.get(key) || 0) + 1,
          );
        },
      );

      return collectionRecords.filter(
        (record) => {
          const key = `${record.artist}|${record.title}`;

          return (
            (counts.get(key) || 0) > 1
          );
        },
      );
    }, [
      collectionRecords,
      showDuplicatesOnly,
    ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex(
        (prev) => (prev + 1) % 4,
      );
    }, 4000);

    return () =>
      clearInterval(interval);
  }, []);

  const tickerMessages = [
    `Portfolio Value ${money(portfolioValue)}`,
    `${collectionCount} Records Indexed`,
    `${topEstimated.length} Value Leaders Active`,
    `Collector Intelligence Online`,
  ];

  const enrichmentCoverage =
    useMemo(() => {
      if (!collectionRecords.length)
        return 0;

      const enriched =
        collectionRecords.filter(
          (r) =>
            r.discogs_image_url,
        ).length;

      return Math.round(
        (enriched /
          collectionRecords.length) *
          100,
      );
    }, [collectionRecords]);

  const avgValue =
    useMemo(() => {
      if (!collectionRecords.length)
        return 0;

      const total =
        collectionRecords.reduce(
          (sum, r) =>
            sum +
            Number(
              r.estimated_value ||
                0,
            ),
          0,
        );

      return total /
        collectionRecords.length;
    }, [collectionRecords]);

  const duplicateCount =
    useMemo(() => {
      const counts =
        new Map<string, number>();

      collectionRecords.forEach(
        (record) => {
          const key = `${record.artist}|${record.title}`;

          counts.set(
            key,
            (counts.get(key) || 0) + 1,
          );
        },
      );

      return Array.from(
        counts.values(),
      ).filter((c) => c > 1).length;
    }, [collectionRecords]);

  return (
    <main className="min-h-screen bg-[#050403] text-[#F4EFE6]">
      <CINavigation />

      <section className="mx-auto max-w-7xl px-6 py-8">
        <section className="relative overflow-hidden rounded-[38px] border border-[#352819] bg-gradient-to-br from-[#16110B] via-[#0C0A07] to-[#050403] p-8 shadow-[0_18px_80px_rgba(0,0,0,.55)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(199,164,93,.12),transparent_35%)]" />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-[#D0B06C]">
                Collector Intelligence OS
              </p>

              <h1 className="mt-4 text-5xl font-black tracking-tight lg:text-6xl">
                Collection Archive
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#B8AA96]">
                Search, manage, and analyze your archive with integrated
                valuation, market intelligence, and collector workflow tools.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/collection/value-dashboard"
                className="rounded-2xl border border-[#4A3A1E] bg-[#15110B] px-5 py-3 text-sm font-bold text-[#D8B65A] transition hover:bg-[#21170F]"
              >
                Portfolio
              </Link>

              <Link
                href="/collection/market-intelligence"
                className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-5 py-3 text-sm font-bold text-fuchsia-100"
              >
                Market Intelligence
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border border-[#3A2C18] bg-[#110D09] px-6 py-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-[#D8B65A] animate-pulse" />

            <p className="text-xs uppercase tracking-[0.35em] text-[#8E8170]">
              Live Intelligence
            </p>

            <div className="text-sm font-semibold text-[#E7D4AE] transition-all">
              {tickerMessages[tickerIndex]}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Archive Size"
            value={String(
              collectionCount,
            )}
          />

          <MetricCard
            label="Portfolio Value"
            value={money(
              portfolioValue,
            )}
            accent
          />

          <MetricCard
            label="Enrichment"
            value={`${enrichmentCoverage}%`}
          />

          <MetricCard
            label="Avg Record Value"
            value={money(avgValue)}
          />
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Duplicates"
            value={String(
              duplicateCount,
            )}
          />

          <MetricCard
            label="Value Leaders"
            value={String(
              topEstimated.length,
            )}
          />

          <MetricCard
            label="CI Status"
            value="ONLINE"
            accent
          />
        </section>

        {/* legacy metric layer removed */}

        <section className="mt-8 rounded-[34px] border border-[#32281D] bg-[#0F0C09] p-6 shadow-2xl">
          <MetricCard
            label="Archive Size"
            value={String(
              collectionCount,
            )}
          />

          <MetricCard
            label="Portfolio Value"
            value={money(
              portfolioValue,
            )}
            accent
          />

          <MetricCard
            label="Top Value Records"
            value={String(
              topEstimated.length,
            )}
          />
        </section>

        <section className="mt-8 rounded-[34px] border border-[#32281D] bg-[#0F0C09] p-6 shadow-2xl">
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
              showDuplicatesOnly={
                showDuplicatesOnly
              }
              setShowDuplicatesOnly={
                setShowDuplicatesOnly
              }
              duplicateCount={
                duplicateCount
              }
            />
          </div>

          <div className="mt-6 flex flex-col gap-4 lg:flex-row">
            <input
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(
                  e.target.value,
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter"
                ) {
                  handleSearch();
                }
              }}
              placeholder="Search artist, title, label, year..."
              className="h-16 flex-1 rounded-3xl border border-[#3A3025] bg-[#090705] px-6 text-white outline-none"
            />

            <button
              onClick={handleSearch}
              className="h-16 rounded-3xl bg-[#C7A45D] px-8 font-black text-black transition hover:bg-[#D8B86A]"
            >
              {loading
                ? "Searching..."
                : "Search"}
            </button>
          </div>
        </section>

        {topEstimated.length > 0 ? (
          <section className="mt-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-black">
                Value Leaders
              </h2>

              <Link
                href="/collection/market-leaders"
                className="text-sm font-bold text-[#D8B65A]"
              >
                View Full Ranking
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              {topEstimated.map(
                (record) => (
                  <Link
                    key={record.id}
                    href={`/collection/${record.id}`}
                    className="overflow-hidden rounded-3xl border border-[#2D241B] bg-[#0D0A08]"
                  >
                    <img
                      src={
                        record.discogs_image_url ||
                        "https://picsum.photos/500/500"
                      }
                      alt={
                        record.title ||
                        "Record"
                      }
                      className="aspect-square w-full object-cover"
                    />

                    <div className="p-4">
                      <p className="text-xs uppercase text-[#B48A4D]">
                        {
                          record.artist
                        }
                      </p>

                      <p className="mt-2 line-clamp-2 font-black">
                        {
                          record.title
                        }
                      </p>

                      <p className="mt-2 text-sm text-[#A89782]">
                        {money(
                          record.estimated_value,
                        )}
                      </p>
                    </div>
                  </Link>
                ),
              )}
            </div>
          </section>
        ) : null}

        <section
          ref={resultsRef}
          className="mt-10"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-3xl font-black">
              {
                displayedRecords.length
              }{" "}
              Records
            </h2>

            {searchQuery ? (
              <div className="text-sm text-[#8E8170]">
                Search:{" "}
                {searchQuery}
              </div>
            ) : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {displayedRecords.map(
              (record) => (
                <Link
                  key={record.id}
                  href={`/collection/${record.id}`}
                  className="overflow-hidden rounded-[30px] border border-[#2D241B] bg-gradient-to-br from-[#120F0C] to-[#090705] transition hover:-translate-y-1 hover:border-[#D0B06C]/30"
                >
                  <img
                    src={
                      record.discogs_image_url ||
                      "https://picsum.photos/500/500"
                    }
                    alt={
                      record.title ||
                      "Record"
                    }
                    className="aspect-square w-full object-cover"
                  />

                  <div className="p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#B48A4D]">
                      {
                        record.artist
                      }
                    </p>

                    <p className="mt-2 text-2xl font-black text-white">
                      {
                        record.title
                      }
                    </p>

                    <p className="mt-2 text-sm text-[#A89782]">
                      {
                        record.label
                      }{" "}
                      ·{" "}
                      {
                        record.year
                      }
                    </p>

                    <div className="mt-5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase text-[#7B7061]">
                          Estimated Value
                        </p>

                        <p className="mt-1 text-lg font-black text-[#D8B65A]">
                          {money(
                            record.estimated_value,
                          )}
                        </p>
                      </div>

                      <div className="rounded-full border border-[#3A3025] px-3 py-2 text-xs font-bold text-[#D8B65A]">
                        Open Profile
                      </div>
                    </div>
                  </div>
                </Link>
              ),
            )}
          </div>
        </section>
      </section>
    </main>
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
    <div className="rounded-3xl border border-[#2D241B] bg-[#100D09] p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-[#8E8170]">
        {label}
      </p>

      <p
        className={`mt-3 text-4xl font-black ${
          accent
            ? "text-[#D8B65A]"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}