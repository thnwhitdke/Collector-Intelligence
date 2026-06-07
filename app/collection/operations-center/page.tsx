import CINavigation from "@/app/components/CINavigation";
import Link from "next/link";
import { createAdminClient } from "@/src/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Signal = {
  id: number;
  signal_date: string;
  signal_type: string;
  signal_title: string;
  signal_summary: string;
  signal_strength: number;
  artist: string | null;
  created_at: string;
};

type MarketObservation = {
  id: number;
  artist_name: string;
  release_title: string | null;
  discogs_release_id: number | null;
  marketplace_for_sale: number | null;
  lowest_price: number | null;
  have_count: number | null;
  want_count: number | null;
  signal_type: string | null;
  observed_at: string;
};

function strengthLabel(value: number | null | undefined) {
  const n = Number(value || 0);

  if (n >= 250) return "Major Signal";
  if (n >= 100) return "Strong Signal";
  if (n >= 40) return "Active Signal";
  return "Watch Signal";
}

function marketTone(type: string | null) {
  const value = String(type || "");

  if (value.includes("Rare")) {
    return "border-red-500/25 bg-red-500/[0.08] text-red-100";
  }

  if (value.includes("Supply")) {
    return "border-orange-500/25 bg-orange-500/[0.08] text-orange-100";
  }

  if (value.includes("Demand")) {
    return "border-fuchsia-500/25 bg-fuchsia-500/[0.08] text-fuchsia-100";
  }

  return "border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-100";
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function tone(type: string) {
  if (type.includes("Demand")) {
    return "border-fuchsia-500/25 bg-fuchsia-500/[0.08] text-fuchsia-100";
  }

  if (type.includes("Supply")) {
    return "border-orange-500/25 bg-orange-500/[0.08] text-orange-100";
  }

  if (type.includes("Rarity")) {
    return "border-red-500/25 bg-red-500/[0.08] text-red-100";
  }

  return "border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-100";
}

export default async function OperationsCenterPage() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("collector_signal_feed")
    .select(`
      id,
      signal_date,
      signal_type,
      signal_title,
      signal_summary,
      signal_strength,
      artist,
      created_at
    `)
    .order("signal_strength", { ascending: false })
    .limit(40);

  const signals = (data || []) as Signal[];

  const { data: observationData, error: observationError } = await supabase
    .from("market_observations")
    .select(`
      id,
      artist_name,
      release_title,
      discogs_release_id,
      marketplace_for_sale,
      lowest_price,
      have_count,
      want_count,
      signal_type,
      observed_at
    `)
    .order("observed_at", { ascending: false })
    .limit(30);

  const observations = (observationData || []) as MarketObservation[];

  const demandCount = signals.filter((s) =>
    s.signal_type.includes("Demand"),
  ).length;

  const supplyCount = signals.filter((s) =>
    s.signal_type.includes("Supply"),
  ).length;

  const watchCount = signals.filter((s) =>
    s.signal_type.includes("Watch"),
  ).length;

  const topSignal = signals[0];
  const topObservation = observations[0];

  return (
    <main className="min-h-screen bg-[#050403] px-6 py-8 text-[#F4EFE6] lg:px-10">
      <CINavigation />

      <div className="mx-auto flex max-w-[1800px] flex-col gap-8">
        <section className="relative overflow-hidden rounded-[44px] border border-[#3A2A14] bg-[radial-gradient(circle_at_top_left,rgba(255,210,30,0.16),transparent_34%),linear-gradient(135deg,#170F08,#060403_54%,#130B05)] p-9 shadow-[0_24px_100px_rgba(0,0,0,.72)]">
          <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-center">
            <div>
              <div className="inline-flex rounded-full border border-[#D8B65A]/25 bg-[#D8B65A]/10 px-5 py-2 text-[11px] font-black uppercase tracking-[0.35em] text-[#F4CD68]">
                Collector Intelligence Operations
              </div>

              <h1 className="mt-6 max-w-5xl text-5xl font-black leading-[0.92] tracking-tight md:text-7xl">
                Operations <span className="text-[#FFD21E]">Center</span>
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-7 text-[#B8AA96]">
                A Bloomberg-style command surface for collection-wide market
                signals, artist clusters, supply compression, demand events,
                and emerging collector watch conditions.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/collection/market-intelligence" className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-5 py-3 text-sm font-black text-cyan-100">
                  Market Intelligence
                </Link>
                <Link href="/collection/want-list" className="rounded-2xl border border-orange-500/25 bg-orange-500/10 px-5 py-3 text-sm font-black text-orange-100">
                  Acquisition Radar
                </Link>
                <Link href="/collection/value-dashboard" className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/10 px-5 py-3 text-sm font-black text-fuchsia-100">
                  Portfolio
                </Link>
              </div>
            </div>

            <div className="rounded-[34px] border border-[#D8B65A]/20 bg-black/40 p-6">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#F4CD68]">
                Top Signal
              </p>

              <p className="mt-4 text-4xl font-black text-white">
                {topSignal?.artist || "Building"}
              </p>

              <p className="mt-3 text-lg font-black text-[#FFD21E]">
                {topSignal ? strengthLabel(topSignal.signal_strength) : "No Signal"}
              </p>

              <p className="mt-4 text-sm leading-6 text-[#B8AA96]">
                {topSignal?.signal_summary || "Signal engine is waiting for market observations."}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Signals" value={String(signals.length)} />
          <Kpi label="Market Watches" value={String(observations.length)} />
          <Kpi label="Demand Clusters" value={String(demandCount)} />
          <Kpi label="Supply Compression" value={String(supplyCount)} />
        </section>

        {error || observationError ? (
          <div className="rounded-[28px] border border-red-500/25 bg-red-500/[0.08] p-6 text-red-100">
            {error?.message || observationError?.message}
          </div>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D8B65A]">
              Live Signal Feed
            </p>

            <h2 className="mt-3 text-3xl font-black text-white">
              Collector Intelligence Wire
            </h2>

            <div className="mt-6 grid gap-4">
              {signals.map((signal) => (
                <article
                  key={signal.id}
                  className={`rounded-[28px] border p-5 ${tone(signal.signal_type)}`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em]">
                        {signal.signal_type}
                      </p>

                      <h3 className="mt-2 text-2xl font-black text-white">
                        {signal.artist || signal.signal_title}
                      </h3>

                      <p className="mt-3 max-w-3xl text-sm leading-7 text-[#D8CDBE]">
                        {signal.signal_summary}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-right">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[#B8AA96]">
                        Strength
                      </p>
                      <p className="mt-1 text-2xl font-black text-white">
                        {Math.round(Number(signal.signal_strength || 0))}
                      </p>
                    </div>
                  </div>
                </article>
              ))}

              {signals.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-white/10 p-10 text-center text-[#B8AA96]">
                  No signals generated yet.
                </div>
              ) : null}
            </div>
          </section>


          <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D8B65A]">
              External Market Watch
            </p>

            <h2 className="mt-3 text-3xl font-black text-white">
              Favorite Artist Market Observations
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#B8AA96]">
              Signals from active favorite artists outside the collection view:
              supply, demand, price, and marketplace activity.
            </p>

            <div className="mt-6 grid gap-4">
              {observations.map((observation) => (
                <article
                  key={observation.id}
                  className={`rounded-[28px] border p-5 ${marketTone(observation.signal_type)}`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em]">
                        {observation.signal_type || "Market Observation"}
                      </p>

                      <h3 className="mt-2 text-2xl font-black text-white">
                        {observation.artist_name}
                      </h3>

                      <p className="mt-2 text-lg font-black text-[#F4EFE6]">
                        {observation.release_title || "Untitled Release"}
                      </p>

                      <p className="mt-3 text-sm leading-7 text-[#D8CDBE]">
                        {observation.marketplace_for_sale ?? "—"} copies for sale · {observation.want_count ?? "—"} want · {observation.have_count ?? "—"} have · lowest ask {money(observation.lowest_price)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 md:items-end">
                      {observation.discogs_release_id ? (
                        <a
                          href={`https://www.discogs.com/release/${observation.discogs_release_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-black text-white"
                        >
                          Discogs
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}

              {observations.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-white/10 p-10 text-center text-[#B8AA96]">
                  No external market observations yet.
                </div>
              ) : null}
            </div>
          </section>

          <aside className="grid gap-5">
            <section className="rounded-[34px] border border-cyan-500/20 bg-cyan-500/[0.06] p-6">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-200">
                What This Means
              </p>
              <h2 className="mt-3 text-2xl font-black text-white">
                From Catalog to Intelligence
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#B8AA96]">
                This feed converts collection and market metadata into operational
                intelligence. Future versions will compare history over time,
                follow favorite artists, detect new marketplace events, and alert
                users when collector conditions change.
              </p>
            </section>

            <section className="rounded-[34px] border border-fuchsia-500/20 bg-fuchsia-500/[0.06] p-6">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-fuchsia-200">
                Coming Next
              </p>
              <div className="mt-5 grid gap-3 text-sm text-[#B8AA96]">
                <Roadmap label="Favorite Artist Watchlists" />
                <Roadmap label="Historical Signal Movement" />
                <Roadmap label="Buy / Sell Timing Intelligence" />
                <Roadmap label="External Market Observations" />
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-[#8E8170]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Roadmap({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
      {label}
    </div>
  );
}
