import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";

type SearchParams = {
  q?: string;
  signal?: string;
  sort?: string;
};

type MarketRecord = {
  id: string;
  artist: string | null;
  title: string | null;
  label: string | null;
  year_released: string | number | null;
  format: string | null;
  cover_url: string | null;
  estimated_value: number | string | null;
  discogs_low_price: number | string | null;
  discogs_median_price: number | string | null;
  discogs_high_price: number | string | null;
  discogs_for_sale: number | null;
  discogs_last_sold_date: string | null;
  value_source: string | null;
  value_last_updated: string | null;
  discogs_url: string | null;
};

function toNumber(value: number | string | null) {
  if (typeof value === "string") {
    const cleaned = value.replace(/[$,]/g, "").trim();
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) return value;

  return null;
}

function money(value: number | string | null) {
  const numericValue = toNumber(value);

  if (numericValue === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numericValue);
}

function formatDate(value: string | null) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function daysSince(value: string | null) {
  if (!value) return null;

  const then = new Date(value).getTime();

  if (Number.isNaN(then)) return null;

  return Math.floor((Date.now() - then) / 86400000);
}

function valueSpread(record: MarketRecord) {
  const low = toNumber(record.discogs_low_price);
  const high = toNumber(record.discogs_high_price);

  if (low === null || high === null || low <= 0 || high <= 0) return null;

  return high - low;
}

function marketSignal(record: MarketRecord) {
  const forSale = record.discogs_for_sale;
  const lastSoldDays = daysSince(record.discogs_last_sold_date);
  const spread = valueSpread(record);
  const estimated = toNumber(record.estimated_value);

  if (forSale !== null && forSale <= 2 && estimated !== null && estimated >= 40) {
    return {
      label: "Hot Thin Market",
      shortLabel: "Hot",
      description:
        "Very few copies are listed and the record has meaningful value. This may be worth watching closely for a sell or hold decision.",
      action: "Watch closely / consider premium pricing",
      className: "border-orange-400/30 bg-orange-400/10 text-orange-100",
    };
  }

  if (forSale !== null && forSale <= 2) {
    return {
      label: "Thin Market",
      shortLabel: "Thin",
      description:
        "Very few copies are currently listed. Scarcity may matter here, especially if demand improves.",
      action: "Monitor scarcity",
      className: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    };
  }

  if (spread !== null && spread >= 50) {
    return {
      label: "Volatile Market",
      shortLabel: "Volatile",
      description:
        "The gap between low and high values is wide. This suggests pricing uncertainty or condition-sensitive value.",
      action: "Check condition and comps carefully",
      className: "border-red-400/30 bg-red-400/10 text-red-100",
    };
  }

  if (forSale !== null && forSale >= 25) {
    return {
      label: "Saturated Market",
      shortLabel: "Saturated",
      description:
        "Many copies are listed. Pricing may need to be competitive unless your copy has superior condition or rarity.",
      action: "Price competitively",
      className: "border-slate-400/30 bg-slate-400/10 text-slate-100",
    };
  }

  if (lastSoldDays !== null && lastSoldDays <= 45) {
    return {
      label: "Active Market",
      shortLabel: "Active",
      description:
        "Recent sales activity suggests current buyer interest. This record has signs of active market demand.",
      action: "Good candidate to monitor",
      className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    };
  }

  if (lastSoldDays !== null && lastSoldDays > 730) {
    return {
      label: "Quiet Market",
      shortLabel: "Quiet",
      description:
        "Last known sale is old. Value may be harder to prove quickly, and buyers may be less active.",
      action: "Hold unless priced carefully",
      className: "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-100",
    };
  }

  if (
    record.estimated_value === null &&
    record.discogs_median_price === null &&
    record.discogs_for_sale === null
  ) {
    return {
      label: "Needs Market Data",
      shortLabel: "Needs Data",
      description:
        "This record does not yet have enough market information to classify confidently.",
      action: "Pull values / enrich data",
      className: "border-zinc-400/30 bg-zinc-400/10 text-zinc-100",
    };
  }

  return {
    label: "Monitor",
    shortLabel: "Monitor",
    description:
      "Market data is available, but no strong signal stands out yet. Keep this in the watch layer.",
    action: "Monitor",
    className: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  };
}

function normalizeSearch(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function matchesSearch(record: MarketRecord, query: string) {
  if (!query) return true;

  const haystack = [
    record.artist,
    record.title,
    record.label,
    record.format,
    record.year_released === null || record.year_released === undefined
      ? null
      : String(record.year_released),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function sortRecords(records: MarketRecord[], sort: string) {
  const sorted = [...records];

  if (sort === "supply_low") {
    return sorted.sort((a, b) => {
      const left = a.discogs_for_sale ?? 999999;
      const right = b.discogs_for_sale ?? 999999;
      return left - right;
    });
  }

  if (sort === "recent_sale") {
    return sorted.sort((a, b) => {
      const left = a.discogs_last_sold_date
        ? new Date(a.discogs_last_sold_date).getTime()
        : 0;
      const right = b.discogs_last_sold_date
        ? new Date(b.discogs_last_sold_date).getTime()
        : 0;
      return right - left;
    });
  }

  if (sort === "spread_high") {
    return sorted.sort((a, b) => {
      const left = valueSpread(a) ?? 0;
      const right = valueSpread(b) ?? 0;
      return right - left;
    });
  }

  if (sort === "updated_recent") {
    return sorted.sort((a, b) => {
      const left = a.value_last_updated
        ? new Date(a.value_last_updated).getTime()
        : 0;
      const right = b.value_last_updated
        ? new Date(b.value_last_updated).getTime()
        : 0;
      return right - left;
    });
  }

  return sorted.sort((a, b) => {
    const left = toNumber(a.estimated_value) ?? 0;
    const right = toNumber(b.estimated_value) ?? 0;
    return right - left;
  });
}

function buildQuery(params: {
  q?: string;
  signal?: string;
  sort?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params.q) searchParams.set("q", params.q);
  if (params.signal && params.signal !== "all") {
    searchParams.set("signal", params.signal);
  }
  if (params.sort && params.sort !== "value_high") {
    searchParams.set("sort", params.sort);
  }

  const query = searchParams.toString();

  return query ? `/collection/market-intelligence?${query}` : "/collection/market-intelligence";
}

export default async function MarketIntelligencePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const q = normalizeSearch(params.q);
  const selectedSignal = params.signal ?? "all";
  const selectedSort = params.sort ?? "value_high";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id ?? "";

  let query = supabase
    .from("records_clean_safe")
    .select(
      `
      id,
      artist,
      title,
      label,
      year_released,
      format,
      cover_url,
      estimated_value,
      discogs_low_price,
      discogs_median_price,
      discogs_high_price,
      discogs_for_sale,
      discogs_last_sold_date,
      value_source,
      value_last_updated,
      discogs_url
    `
    )
    .not("estimated_value", "is", null)
    .order("estimated_value", { ascending: false })
    .limit(500);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  const rawRecords = (data ?? []) as MarketRecord[];

  const searchedRecords = rawRecords.filter((record) => matchesSearch(record, q));

  const signalFilteredRecords =
    selectedSignal === "all"
      ? searchedRecords
      : searchedRecords.filter((record) => {
          const signal = marketSignal(record);
          return signal.shortLabel.toLowerCase().replace(/\s+/g, "_") === selectedSignal;
        });

  const records = sortRecords(signalFilteredRecords, selectedSort);

  const totalEstimatedValue = records.reduce((sum, record) => {
    const value = toNumber(record.estimated_value);
    return sum + (value ?? 0);
  }, 0);

  const thinMarketCount = rawRecords.filter((record) => {
    const signal = marketSignal(record);
    return signal.shortLabel === "Thin" || signal.shortLabel === "Hot";
  }).length;

  const activeMarketCount = rawRecords.filter((record) => {
    const signal = marketSignal(record);
    return signal.shortLabel === "Active";
  }).length;

  const volatileMarketCount = rawRecords.filter((record) => {
    const signal = marketSignal(record);
    return signal.shortLabel === "Volatile";
  }).length;

  return (
    <main className="min-h-screen bg-[#0b1118] px-6 py-8 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-8 shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
                Collector Intelligence
              </p>
              <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                Market Intelligence
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Use this page to understand which records have scarcity, recent buyer activity,
                pricing volatility, saturated supply, or weak market evidence. This is the
                decision layer: what to watch, what to price carefully, and what may deserve
                attention next.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/collection"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                ← Back to Collection
              </Link>
              <Link
                href="/collection/value-dashboard"
                className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              >
                Value Dashboard
              </Link>
            </div>
          </div>
        </header>

        {error ? (
          <section className="rounded-[2rem] border border-red-400/30 bg-red-950/40 p-6 text-red-100">
            <h2 className="text-xl font-bold">Market Intelligence could not load.</h2>
            <p className="mt-2 text-sm text-red-100/80">{error.message}</p>
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/[0.06] p-6">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">
                How to use this page
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Search, filter, and sort market signals
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Search for an artist, title, label, year, or format. Then filter by market
                signal. Thin and Hot markets point to scarcity. Active markets show recent
                sales activity. Volatile markets need careful condition and pricing review.
                Saturated markets may require competitive pricing.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Signal legend
              </p>
              <div className="mt-4 grid gap-2 text-sm text-slate-300">
                <p>
                  <span className="font-bold text-orange-200">Hot</span> — scarce and meaningful value.
                </p>
                <p>
                  <span className="font-bold text-amber-200">Thin</span> — very few copies listed.
                </p>
                <p>
                  <span className="font-bold text-emerald-200">Active</span> — recent sale activity.
                </p>
                <p>
                  <span className="font-bold text-red-200">Volatile</span> — wide low-to-high spread.
                </p>
                <p>
                  <span className="font-bold text-slate-200">Saturated</span> — many copies listed.
                </p>
              </div>
            </div>
          </div>
        </section>

        <form
          action="/collection/market-intelligence"
          className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl"
        >
          <div className="grid gap-4 lg:grid-cols-[1.5fr_0.8fr_0.8fr_auto] lg:items-end">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Search
              </label>
              <input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Artist, title, label, year, or format..."
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Market Signal
              </label>
              <select
                name="signal"
                defaultValue={selectedSignal}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
              >
                <option value="all">All signals</option>
                <option value="hot">Hot Thin Market</option>
                <option value="thin">Thin Market</option>
                <option value="active">Active Market</option>
                <option value="volatile">Volatile Market</option>
                <option value="saturated">Saturated Market</option>
                <option value="quiet">Quiet Market</option>
                <option value="monitor">Monitor</option>
                <option value="needs_data">Needs Market Data</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Sort
              </label>
              <select
                name="sort"
                defaultValue={selectedSort}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
              >
                <option value="value_high">Highest estimated value</option>
                <option value="supply_low">Lowest supply</option>
                <option value="recent_sale">Most recent sale</option>
                <option value="spread_high">Highest volatility</option>
                <option value="updated_recent">Recently updated</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
              >
                Apply
              </button>
              <Link
                href="/collection/market-intelligence"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Reset
              </Link>
            </div>
          </div>
        </form>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
              Estimated Value Shown
            </p>
            <p className="mt-3 text-3xl font-black text-white">
              {money(totalEstimatedValue)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Based on the filtered results shown below.
            </p>
          </div>

          <div className="rounded-[2rem] border border-amber-400/20 bg-amber-400/[0.06] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-200/80">
              Thin / Hot Markets
            </p>
            <p className="mt-3 text-3xl font-black text-white">{thinMarketCount}</p>
            <p className="mt-2 text-xs text-amber-100/60">
              Scarcity signals from the loaded market set.
            </p>
          </div>

          <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/[0.06] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200/80">
              Active Markets
            </p>
            <p className="mt-3 text-3xl font-black text-white">{activeMarketCount}</p>
            <p className="mt-2 text-xs text-emerald-100/60">
              Records with recent sale activity.
            </p>
          </div>

          <div className="rounded-[2rem] border border-red-400/20 bg-red-400/[0.06] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-200/80">
              Volatile Markets
            </p>
            <p className="mt-3 text-3xl font-black text-white">{volatileMarketCount}</p>
            <p className="mt-2 text-xs text-red-100/60">
              Wide low-to-high value spread.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                Results
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">
                {records.length} market records shown
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-400">
              Use these cards to decide which records deserve attention. The signal is
              not a command to sell or buy; it is a market clue for deeper review.
            </p>
          </div>
        </section>

        <section className="grid gap-5">
          {records.map((record) => {
            const signal = marketSignal(record);
            const lastSoldDays = daysSince(record.discogs_last_sold_date);
            const spread = valueSpread(record);

            return (
              <article
                key={record.id}
                className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-xl"
              >
                <div className="grid md:grid-cols-[150px_1fr]">
                  <div className="bg-black/30 p-4">
                    <div className="aspect-square overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                      {record.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={record.cover_url}
                          alt={`${record.artist ?? "Unknown artist"} - ${
                            record.title ?? "Untitled"
                          }`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.2em] text-slate-500">
                          No Cover
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h2 className="text-2xl font-black text-white">
                          {record.title ?? "Untitled Record"}
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-cyan-200">
                          {record.artist ?? "Unknown Artist"}
                        </p>
                        <p className="mt-2 text-sm text-slate-400">
                          {[record.label, record.year_released, record.format]
                            .filter(Boolean)
                            .join(" • ") || "No label/year/format metadata"}
                        </p>
                      </div>

                      <div
                        className={`rounded-2xl border px-4 py-3 text-sm ${signal.className}`}
                      >
                        <p className="font-bold">{signal.label}</p>
                        <p className="mt-1 max-w-sm text-xs opacity-80">
                          {signal.description}
                        </p>
                        <p className="mt-2 text-xs font-bold uppercase tracking-[0.15em] opacity-90">
                          {signal.action}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-7">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Estimated
                        </p>
                        <p className="mt-2 text-xl font-black text-white">
                          {money(record.estimated_value)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Low
                        </p>
                        <p className="mt-2 text-lg font-bold text-slate-100">
                          {money(record.discogs_low_price)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Median
                        </p>
                        <p className="mt-2 text-lg font-bold text-slate-100">
                          {money(record.discogs_median_price)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          High
                        </p>
                        <p className="mt-2 text-lg font-bold text-slate-100">
                          {money(record.discogs_high_price)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Spread
                        </p>
                        <p className="mt-2 text-lg font-bold text-white">
                          {spread === null ? "—" : money(spread)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          For Sale
                        </p>
                        <p className="mt-2 text-lg font-bold text-white">
                          {record.discogs_for_sale ?? "—"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Last Sold
                        </p>
                        <p className="mt-2 text-sm font-bold text-white">
                          {formatDate(record.discogs_last_sold_date)}
                        </p>
                        {lastSoldDays !== null ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {lastSoldDays} days ago
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Plain-English read
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {signal.description} The practical next step is:{" "}
                        <span className="font-bold text-cyan-100">{signal.action}</span>.
                      </p>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-5 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
                      <div>
                        <span className="text-slate-500">Source:</span>{" "}
                        <span className="text-slate-300">
                          {record.value_source ?? "Unknown"}
                        </span>{" "}
                        <span className="px-2 text-slate-600">•</span>
                        <span className="text-slate-500">Updated:</span>{" "}
                        <span className="text-slate-300">
                          {formatDate(record.value_last_updated)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/collection/${record.id}`}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                          Open Record
                        </Link>

                        {record.discogs_url ? (
                          <a
                            href={record.discogs_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
                          >
                            Discogs
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}