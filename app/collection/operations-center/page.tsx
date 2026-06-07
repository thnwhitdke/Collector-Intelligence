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

type ScoredObservation = MarketObservation & {
  observation_score: number;
  priority: "Critical" | "Watch" | "Monitor";
  intelligence_summary: string;
};

type MarketMovement = {
  id: number;
  artist_name: string;
  release_title: string | null;
  discogs_release_id: number | null;
  marketplace_for_sale: number | null;
  previous_for_sale: number | null;
  for_sale_change: number | null;
  want_count: number | null;
  previous_want_count: number | null;
  want_change: number | null;
  lowest_price: number | null;
  previous_lowest_price: number | null;
  price_change: number | null;
  movement_signal: string;
  observed_at: string;
};

function scoreObservation(observation: MarketObservation): ScoredObservation {
  const forSale = observation.marketplace_for_sale;
  const want = observation.want_count || 0;
  const have = observation.have_count || 0;
  const price = observation.lowest_price || 0;

  let score = 0;

  if (forSale === 0) score += 45;
  else if (forSale !== null && forSale <= 2) score += 35;
  else if (forSale !== null && forSale <= 5) score += 25;
  else if (forSale !== null && forSale <= 10) score += 10;

  if (want >= 1000) score += 30;
  else if (want >= 500) score += 25;
  else if (want >= 250) score += 18;
  else if (want >= 100) score += 10;

  if (have > 0 && want > have) score += 20;
  else if (have > 0 && want / have >= 0.75) score += 10;

  if (price >= 250) score += 10;
  if (String(observation.signal_type || "").includes("Rare")) score += 15;
  if (String(observation.signal_type || "").includes("Supply")) score += 10;
  if (String(observation.signal_type || "").includes("Demand")) score += 8;

  const finalScore = Math.min(100, Math.round(score));

  const priority =
    finalScore >= 80 ? "Critical" : finalScore >= 55 ? "Watch" : "Monitor";

  const intelligence_summary =
    forSale === 0 && want >= 500
      ? "Supply appears exhausted while collector demand is elevated."
      : forSale !== null && forSale <= 5 && want >= 250
        ? "Limited marketplace supply with meaningful collector demand."
        : have > 0 && want > have
          ? "Collector demand currently exceeds recorded ownership."
          : "Market activity is active but does not yet indicate a critical event.";

  return {
    ...observation,
    observation_score: finalScore,
    priority,
    intelligence_summary,
  };
}

function movementTone(signal: string | null) {
  const value = String(signal || "");

  if (value.includes("Compression") || value.includes("Acceleration")) {
    return "border-red-500/25 bg-red-500/[0.08] text-red-100";
  }

  if (value.includes("Expansion")) {
    return "border-orange-500/25 bg-orange-500/[0.08] text-orange-100";
  }

  if (value.includes("Softening")) {
    return "border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-100";
  }

  return "border-white/10 bg-white/[0.035] text-[#F4EFE6]";
}

function delta(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  const n = Number(value);

  if (n > 0) return `+${n}`;
  return String(n);
}

function priorityTone(priority: string) {
  if (priority === "Critical") {
    return "border-red-500/30 bg-red-500/[0.1] text-red-100";
  }

  if (priority === "Watch") {
    return "border-orange-500/30 bg-orange-500/[0.1] text-orange-100";
  }

  return "border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-100";
}

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

export default async function OperationsCenterPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const q = (params.q || "").trim().toLowerCase();

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

  const observations = ((observationData || []) as MarketObservation[])
    .map(scoreObservation)
    .sort((a, b) => b.observation_score - a.observation_score);

  const { data: movementData, error: movementError } = await supabase
    .from("market_observation_movement")
    .select(`
      id,
      artist_name,
      release_title,
      discogs_release_id,
      marketplace_for_sale,
      previous_for_sale,
      for_sale_change,
      want_count,
      previous_want_count,
      want_change,
      lowest_price,
      previous_lowest_price,
      price_change,
      movement_signal,
      observed_at
    `)
    .order("observed_at", { ascending: false })
    .limit(30);

  const movements = (movementData || []) as MarketMovement[];

  const demandCount = signals.filter((s) =>
    s.signal_type.includes("Demand"),
  ).length;

  const supplyCount = signals.filter((s) =>
    s.signal_type.includes("Supply"),
  ).length;

  const watchCount = signals.filter((s) =>
    s.signal_type.includes("Watch"),
  ).length;

  const matchesQuery = (values: Array<string | number | null | undefined>) => {
    if (!q) return true;
    return values
      .filter((value) => value !== null && value !== undefined)
      .join(" ")
      .toLowerCase()
      .includes(q);
  };

  const filteredSignals = signals.filter((signal) =>
    matchesQuery([
      signal.signal_type,
      signal.signal_title,
      signal.signal_summary,
      signal.artist,
    ]),
  );

  const filteredObservations = observations.filter((observation) =>
    matchesQuery([
      observation.artist_name,
      observation.release_title,
      observation.signal_type,
      observation.marketplace_for_sale,
      observation.lowest_price,
      observation.want_count,
      observation.have_count,
    ]),
  );

  const filteredMovements = movements.filter((movement) =>
    matchesQuery([
      movement.artist_name,
      movement.release_title,
      movement.movement_signal,
      movement.marketplace_for_sale,
      movement.previous_for_sale,
      movement.want_count,
      movement.previous_want_count,
      movement.lowest_price,
      movement.previous_lowest_price,
    ]),
  );

  const topSignal = filteredSignals[0] || signals[0];
  const topObservation = filteredObservations[0] || observations[0];

  const visibleObservations = filteredObservations.slice(0, 12);
  const visibleMovements = filteredMovements.slice(0, 8);
  const visibleSignals = filteredSignals.slice(0, 10);

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
          <Kpi label="Signals" value={String(filteredSignals.length)} />
          <Kpi label="Market Watches" value={String(filteredObservations.length)} />
          <Kpi label="Movement Signals" value={String(filteredMovements.length)} />
          <Kpi label="Demand Clusters" value={String(demandCount)} />
          <Kpi label="Supply Compression" value={String(supplyCount)} />
        </section>

        <form action="/collection/operations-center" className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D8B65A]">
            Operations Search
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              name="q"
              defaultValue={params.q || ""}
              placeholder="Search artist, release, signal, price, demand..."
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white outline-none focus:border-[#D8B65A]/60"
            />

            <button className="rounded-2xl bg-[#D8B65A] px-6 py-4 text-sm font-black text-black">
              Search
            </button>
          </div>

          {q ? (
            <a
              href="/collection/operations-center"
              className="mt-4 inline-flex rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-black text-[#F4CD68]"
            >
              Clear Search
            </a>
          ) : null}
        </form>

        {topObservation ? (
          <section className={`rounded-[38px] border p-7 shadow-2xl ${priorityTone(topObservation.priority)}`}>
            <div className="grid gap-6 lg:grid-cols-[1fr_260px] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.32em]">
                  Today's Most Important Signal
                </p>

                <h2 className="mt-3 text-4xl font-black text-white">
                  {topObservation.artist_name}
                </h2>

                <p className="mt-2 text-2xl font-black text-[#FFD21E]">
                  {topObservation.release_title || "Untitled Release"}
                </p>

                <p className="mt-4 max-w-4xl text-sm leading-7 text-[#F4EFE6]/80">
                  {topObservation.intelligence_summary}
                </p>

                <div className="mt-5 flex flex-wrap gap-3 text-sm">
                  <span className="rounded-full border border-white/10 bg-black/25 px-4 py-2">
                    {topObservation.marketplace_for_sale ?? "—"} for sale
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-4 py-2">
                    {topObservation.want_count ?? "—"} want
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-4 py-2">
                    {topObservation.have_count ?? "—"} have
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-4 py-2">
                    Lowest ask {money(topObservation.lowest_price)}
                  </span>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/30 p-5 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-[#B8AA96]">
                  Observation Score
                </p>
                <p className="mt-3 text-6xl font-black text-white">
                  {topObservation.observation_score}
                </p>
                <p className="mt-2 text-sm font-black uppercase tracking-[0.2em]">
                  {topObservation.priority}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {error || observationError || movementError ? (
          <div className="rounded-[28px] border border-red-500/25 bg-red-500/[0.08] p-6 text-red-100">
            {error?.message || observationError?.message || movementError?.message}
          </div>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D8B65A]">
              External Market Watch
            </p>

            <h2 className="mt-3 text-3xl font-black text-white">
              Favorite Artist Market Observations
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#B8AA96]">
              Showing top {visibleObservations.length} of {filteredObservations.length} external market observations from active favorite artists.
            </p>

            <div className="mt-6 grid gap-4">
              {visibleObservations.map((observation) => (
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
                        {observation.intelligence_summary}
                      </p>

                      <p className="mt-3 text-sm leading-7 text-[#D8CDBE]">
                        {observation.marketplace_for_sale ?? "—"} copies for sale · {observation.want_count ?? "—"} want · {observation.have_count ?? "—"} have · lowest ask {money(observation.lowest_price)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 md:items-end">
                      <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-right">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#B8AA96]">
                          Score
                        </p>
                        <p className="mt-1 text-2xl font-black text-white">
                          {observation.observation_score}
                        </p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em]">
                          {observation.priority}
                        </p>
                      </div>
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

                      <a
                        href={`/collection?q=${encodeURIComponent(observation.artist_name)}`}
                        className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-black text-cyan-100"
                      >
                        Search Collection
                      </a>

                      <a
                        href="/collection/favorite-artists"
                        className="rounded-2xl border border-[#D8B65A]/20 bg-[#D8B65A]/10 px-4 py-3 text-sm font-black text-[#F4CD68]"
                      >
                        Artist Watchlist
                      </a>
                    </div>
                  </div>
                </article>
              ))}

              {visibleObservations.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-white/10 p-10 text-center text-[#B8AA96]">
                  No external market observations yet.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D8B65A]">
              Historical Movement
            </p>

            <h2 className="mt-3 text-3xl font-black text-white">
              What Changed Since Last Observation
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#B8AA96]">
              Showing top {visibleMovements.length} of {filteredMovements.length} movement records. Early rows may show New Observation until multiple timed snapshots exist.
            </p>

            <div className="mt-6 grid gap-4">
              {visibleMovements.map((movement) => (
                <article
                  key={movement.id}
                  className={`rounded-[28px] border p-5 ${movementTone(movement.movement_signal)}`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em]">
                        {movement.movement_signal}
                      </p>

                      <h3 className="mt-2 text-2xl font-black text-white">
                        {movement.artist_name}
                      </h3>

                      <p className="mt-2 text-lg font-black text-[#F4EFE6]">
                        {movement.release_title || "Untitled Release"}
                      </p>

                      <p className="mt-3 text-sm leading-7 text-[#D8CDBE]">
                        For sale: {movement.previous_for_sale ?? "—"} → {movement.marketplace_for_sale ?? "—"} ({delta(movement.for_sale_change)}) · Want: {movement.previous_want_count ?? "—"} → {movement.want_count ?? "—"} ({delta(movement.want_change)}) · Price: {money(movement.previous_lowest_price)} → {money(movement.lowest_price)}
                      </p>
                    </div>

                    {movement.discogs_release_id ? (
                      <a
                        href={`https://www.discogs.com/release/${movement.discogs_release_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-black text-white"
                      >
                        Discogs
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}

              {visibleMovements.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-white/10 p-10 text-center text-[#B8AA96]">
                  No historical movement records yet.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D8B65A]">
              Live Signal Feed
            </p>

            <h2 className="mt-3 text-3xl font-black text-white">
              Collector Intelligence Wire
            </h2>

            <p className="mt-3 text-sm leading-7 text-[#B8AA96]">
              Showing top {visibleSignals.length} of {filteredSignals.length} internal collection signals.
            </p>

            <div className="mt-6 grid gap-4">
              {visibleSignals.map((signal) => (
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

              {visibleSignals.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-white/10 p-10 text-center text-[#B8AA96]">
                  No signals generated yet.
                </div>
              ) : null}
            </div>
          </section>

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
