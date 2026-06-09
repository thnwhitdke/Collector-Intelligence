import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";
import LiveMarketFeed from "@/app/components/LiveMarketFeed";
import CINavigation from "@/app/components/CINavigation";

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
  year: string | number | null;
  format: string | null;
  cover_url: string | null;
  discogs_image_url: string | null;
  estimated_value: number | string | null;
  market_consensus_value: number | string | null;
  discogs_low_price: number | string | null;
  discogs_median_price: number | string | null;
  discogs_high_price: number | string | null;
  discogs_for_sale: number | null;
  market_num_for_sale: number | null;
  discogs_last_sold_date: string | null;
  value_last_updated: string | null;
  discogs_url: string | null;
  demand_score: number | null;
  supply_pressure: number | null;
  volatility_score: number | null;
  rarity_score: number | null;
  collector_iq_score: number | null;
  market_momentum: string | null;
  market_signal: string | null;
};

function num(value: unknown) {
  const n = Number(String(value ?? "0").replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num(value));
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function consensusValue(record: MarketRecord) {
  const marketConsensus = num(record.market_consensus_value);
  const estimated = num(record.estimated_value);
  const discogsMedian = num(record.discogs_median_price);

  if (marketConsensus > 0) return marketConsensus;
  if (estimated > 0) return estimated;
  if (discogsMedian > 0) return discogsMedian;

  return 0;
}

function spread(record: MarketRecord) {
  const low = num(record.discogs_low_price);
  const high = num(record.discogs_high_price);
  return low > 0 && high > low ? high - low : 0;
}

function supply(record: MarketRecord) {
  return record.market_num_for_sale ?? record.discogs_for_sale ?? null;
}

function signal(record: MarketRecord) {
  const available = supply(record);
  const value = consensusValue(record);
  const volatility = num(record.volatility_score);
  const demand = num(record.demand_score);
  const momentum = String(record.market_momentum || "").toLowerCase();
  const valueSpread = spread(record);

  if (available !== null && available <= 2 && value >= 75) {
    return {
      label: "Supply Compression",
      action: "Watch closely",
      reason: "Very limited supply with meaningful value.",
      tone: "orange",
    };
  }

  if (momentum.includes("acceler")) {
    return {
      label: "Momentum Leader",
      action: "Review timing",
      reason: "Acceleration signal detected in market behavior.",
      tone: "cyan",
    };
  }

  if (demand >= 50) {
    return {
      label: "High Demand",
      action: "Prioritize",
      reason: "Demand signal is elevated relative to the portfolio.",
      tone: "emerald",
    };
  }

  if (volatility >= 50 || valueSpread >= 75) {
    return {
      label: "Volatile Market",
      action: "Validate comps",
      reason: "Pricing spread or volatility indicates uncertainty.",
      tone: "rose",
    };
  }

  if (available !== null && available >= 25) {
    return {
      label: "Saturated Supply",
      action: "Wait",
      reason: "Market supply is high, reducing urgency.",
      tone: "slate",
    };
  }

  return {
    label: "Stable Market",
    action: "Monitor",
    reason: "No major market disruption detected.",
    tone: "blue",
  };
}

function toneClass(tone: string) {
  const tones: Record<string, string> = {
    orange: "border-orange-500/20 bg-orange-500/[0.08] text-orange-200",
    cyan: "border-cyan-500/20 bg-cyan-500/[0.08] text-cyan-200",
    emerald: "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-200",
    rose: "border-rose-500/20 bg-rose-500/[0.08] text-rose-200",
    slate: "border-slate-500/20 bg-slate-500/[0.08] text-slate-200",
    blue: "border-blue-500/20 bg-blue-500/[0.08] text-blue-200",
  };

  return tones[tone] ?? tones.blue;
}

function matches(record: MarketRecord, query: string) {
  if (!query) return true;
  const haystack = [
    record.artist,
    record.title,
    record.label,
    record.format,
    record.year_released,
    record.year,
    record.market_momentum,
    record.market_signal,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function sortRecords(records: MarketRecord[], sort: string) {
  const rows = [...records];

  if (sort === "supply_low") {
    return rows.sort((a, b) => (supply(a) ?? 999999) - (supply(b) ?? 999999));
  }

  if (sort === "demand_high") {
    return rows.sort((a, b) => num(b.demand_score) - num(a.demand_score));
  }

  if (sort === "volatility_high") {
    return rows.sort((a, b) => num(b.volatility_score) - num(a.volatility_score));
  }

  if (sort === "spread_high") {
    return rows.sort((a, b) => spread(b) - spread(a));
  }

  return rows.sort((a, b) => consensusValue(b) - consensusValue(a));
}

function filterBySignal(records: MarketRecord[], selected: string) {
  if (selected === "all") return records;

  return records.filter((record) => {
    const s = signal(record).label.toLowerCase();

    if (selected === "compression") return s.includes("compression");
    if (selected === "momentum") return s.includes("momentum");
    if (selected === "demand") return s.includes("demand");
    if (selected === "volatile") return s.includes("volatile");
    if (selected === "saturated") return s.includes("saturated");

    return true;
  });
}

export default async function MarketIntelligencePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const q = (params.q ?? "").trim();
  const selectedSignal = params.signal ?? "all";
  const selectedSort = params.sort ?? "value_high";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("records_clean_safe")
    .select(`
      id,
      artist,
      title,
      label,
      year,
      year_released,
      format,
      cover_url,
      discogs_image_url,
      estimated_value,
      market_consensus_value,
      discogs_low_price,
      discogs_median_price,
      discogs_high_price,
      discogs_for_sale,
      market_num_for_sale,
      discogs_last_sold_date,
      value_last_updated,
      discogs_url,
      demand_score,
      supply_pressure,
      volatility_score,
      rarity_score,
      collector_iq_score,
      market_momentum,
      market_signal
    `)
    .limit(2000);

  if (user?.id) {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;

  const raw = ((data ?? []) as MarketRecord[]).filter((record) =>
    matches(record, q),
  );

  const filtered = filterBySignal(raw, selectedSignal);
  const records = sortRecords(filtered, selectedSort).slice(0, 120);

  const compression = raw.filter((record) => signal(record).label === "Supply Compression").length;
  const momentum = raw.filter((record) => signal(record).label === "Momentum Leader").length;
  const demand = raw.filter((record) => signal(record).label === "High Demand").length;
  const volatile = raw.filter((record) => signal(record).label === "Volatile Market").length;
  const marketValue = raw.reduce((sum, record) => sum + consensusValue(record), 0);

  const pulse =
    compression + momentum + demand > volatile
      ? "Constructive"
      : volatile > compression + momentum
        ? "Risk Elevated"
        : "Stable";

  return (
    <main className="min-h-screen bg-[#061018] px-6 py-8 text-white lg:px-10">
      <CINavigation />

      <div className="mx-auto flex max-w-[1800px] flex-col gap-8">
        <section className="relative overflow-hidden rounded-[44px] border border-cyan-500/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),linear-gradient(135deg,#061B2A,#070A12_58%,#0A1520)] p-9 shadow-[0_24px_100px_rgba(0,0,0,.72)]">
          <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-center">
            <div>
              <div className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-5 py-2 text-[11px] font-black uppercase tracking-[0.35em] text-cyan-200">
                Market Behavior Intelligence
              </div>

              <h1 className="mt-6 max-w-5xl text-5xl font-black leading-[0.92] tracking-tight md:text-7xl">
                Market <span className="text-cyan-300">Intelligence</span>
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300">
                Scarcity, momentum, volatility, demand, and supply behavior
                across your private music archive.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/collection/value-dashboard" className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-5 py-3 text-sm font-black text-cyan-100">
                  Portfolio
                </Link>
                <Link href="/collection/want-list" className="rounded-2xl border border-orange-500/25 bg-orange-500/10 px-5 py-3 text-sm font-black text-orange-100">
                  Want Intelligence
                </Link>
                <Link href="/collection" className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white">
                  Collection
                </Link>
              </div>
            </div>

            <div className="rounded-[34px] border border-cyan-500/20 bg-black/35 p-6">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
                Market Pulse
              </p>
              <p className="mt-4 text-5xl font-black text-white">
                {pulse}
              </p>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Collector Intelligence is reading {raw.length.toLocaleString()} assets for
                market behavior, scarcity, price spread, and demand signals.
              </p>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  Market Value Under Watch
                </p>
                <p className="mt-2 text-3xl font-black text-cyan-200">
                  {money(marketValue)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <LiveMarketFeed />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Kpi label="Market Pulse" value={pulse} accent />
          <Kpi label="Market Value Under Watch" value={money(marketValue)} />\n          <Kpi label="Supply Compression" value={String(compression)} />
          <Kpi label="Momentum Leaders" value={String(momentum)} />
          <Kpi label="High Demand" value={String(demand)} />
          <Kpi label="Volatile Markets" value={String(volatile)} />
        </section>

        <form action="/collection/market-intelligence" className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">
                Market Control Layer
              </p>
              <h2 className="mt-3 text-3xl font-black">
                Signal Search
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto]">
              <input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Search artist, title, label, signal..."
                className="h-14 rounded-2xl border border-white/10 bg-black/30 px-5 text-white outline-none"
              />

              <select
                name="signal"
                defaultValue={selectedSignal}
                className="h-14 rounded-2xl border border-white/10 bg-black/30 px-5 text-white outline-none"
              >
                <option value="all">All Signals</option>
                <option value="compression">Supply Compression</option>
                <option value="momentum">Momentum Leaders</option>
                <option value="demand">High Demand</option>
                <option value="volatile">Volatile</option>
                <option value="saturated">Saturated Supply</option>
              </select>

              <select
                name="sort"
                defaultValue={selectedSort}
                className="h-14 rounded-2xl border border-white/10 bg-black/30 px-5 text-white outline-none"
              >
                <option value="value_high">Highest Value</option>
                <option value="demand_high">Highest Demand</option>
                <option value="spread_high">Highest Spread</option>
                <option value="supply_low">Lowest Supply</option>
                <option value="volatility_high">Highest Volatility</option>
              </select>

              <button className="h-14 rounded-2xl bg-cyan-300 px-6 font-black text-slate-950">
                Apply
              </button>
            </div>
          </div>
        </form>

        {error ? (
          <div className="rounded-[28px] border border-rose-500/20 bg-rose-500/[0.08] p-6 text-rose-100">
            {error.message}
          </div>
        ) : null}

        <section className="grid gap-5 pb-12">
          {records.length > 0 ? (
            records.map((record) => {
              const s = signal(record);

              return (
                <article
                  key={record.id}
                  className="overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-[#101923] to-[#05080C] shadow-2xl shadow-black/40"
                >
                  <div className="grid gap-0 md:grid-cols-[150px_1fr_300px]">
                    <div className="bg-black/25 p-5">
                      <div className="aspect-square overflow-hidden rounded-[26px] border border-white/10 bg-black">
                        {record.cover_url || record.discogs_image_url ? (
                          <img
                            src={record.cover_url || record.discogs_image_url || ""}
                            alt={record.title ?? "Record"}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-slate-500">
                            NO COVER
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-6">
                      <div className={`inline-flex rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${toneClass(s.tone)}`}>
                        {s.label}
                      </div>

                      <p className="mt-5 text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
                        {record.artist ?? "Unknown Artist"}
                      </p>

                      <h3 className="mt-2 text-4xl font-black text-white">
                        {record.title ?? "Untitled"}
                      </h3>

                      <p className="mt-3 text-sm text-slate-400">
                        {[record.label, record.year_released || record.year, record.format]
                          .filter(Boolean)
                          .join(" • ") || "Release details pending"}
                      </p>

                      <div className="mt-5 grid gap-3 md:grid-cols-4">
                        <Mini label="Median" value={money(record.discogs_median_price)} />
                        <Mini label="Spread" value={money(spread(record))} />
                        <Mini label="Supply" value={String(supply(record) ?? "—")} />
                        <Mini label="Updated" value={formatDate(record.value_last_updated)} />
                      </div>
                    </div>

                    <div className="border-t border-white/10 bg-black/25 p-6 md:border-l md:border-t-0">
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                        Recommended Action
                      </p>
                      <p className="mt-3 text-3xl font-black text-cyan-100">
                        {s.action}
                      </p>
                      <p className="mt-4 text-sm leading-6 text-slate-300">
                        {s.reason}
                      </p>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <Mini label="Consensus" value={money(consensusValue(record))} />
                        <Mini label="Demand" value={String(record.demand_score ?? "—")} />
                        <Mini label="IQ" value={String(record.collector_iq_score ?? "—")} />
                        <Mini label="Rarity" value={String(record.rarity_score ?? "—")} />
                      </div>

                      <div className="mt-6 flex flex-wrap gap-2">
                        <Link href={`/collection/${record.id}`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm">
                          Open Record
                        </Link>

                        {record.discogs_url ? (
                          <a href={record.discogs_url} target="_blank" className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
                            Discogs
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[34px] border border-white/10 bg-white/[0.03] p-10 text-center text-slate-400">
              No market records match the current signal search.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Kpi({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
        {label}
      </p>
      <p className={accent ? "mt-3 text-3xl font-black text-cyan-200" : "mt-3 text-3xl font-black text-white"}>
        {value}
      </p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-white">
        {value}
      </p>
    </div>
  );
}
