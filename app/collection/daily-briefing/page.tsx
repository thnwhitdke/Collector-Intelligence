import CINavigation from "@/app/components/CINavigation";
import Link from "next/link";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Observation = {
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

type Movement = {
  id: number;
  artist_name: string;
  release_title: string | null;
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
};

type RecordRow = {
  id: number;
  artist: string | null;
  artist_canonical: string | null;
  estimated_value: string | null;
  market_consensus_value: string | number | null;
  discogs_release_id: string | null;
  discogs_url: string | null;
  cover_url: string | null;
  discogs_image_url: string | null;
  discogs_median_price: number | null;
  market_median_price: number | null;
};

function money(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(parsed)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(parsed);
}

function numericValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function consensusValue(record: RecordRow) {
  const marketConsensus = numericValue(record.market_consensus_value);
  const estimated = numericValue(record.estimated_value);
  const discogsMedian = numericValue(record.discogs_median_price);

  if (marketConsensus > 0) return marketConsensus;
  if (estimated > 0) return estimated;
  if (discogsMedian > 0) return discogsMedian;

  return 0;
}

function marketBenchmark(record: RecordRow) {
  const marketMedian = Number(record.market_median_price);
  const discogsMedian = Number(record.discogs_median_price);

  if (Number.isFinite(marketMedian) && marketMedian > 0) return marketMedian;
  if (Number.isFinite(discogsMedian) && discogsMedian > 0) return discogsMedian;

  return null;
}

function hasMarketVariance(record: RecordRow) {
  const estimated = numericValue(record.estimated_value);
  const benchmark = marketBenchmark(record);

  if (estimated <= 0 || benchmark === null) return false;

  const difference = Math.abs(estimated - benchmark);
  const variancePercent = (difference / Math.max(benchmark, 1)) * 100;

  return difference >= 10 && variancePercent >= 25;
}

function scoreObservation(item: Observation) {
  const want = item.want_count || 0;
  const have = item.have_count || 0;
  const forSale = item.marketplace_for_sale;
  const signal = String(item.signal_type || "");

  let score = 0;

  if (forSale === 0) score += 45;
  else if (forSale !== null && forSale <= 2) score += 35;
  else if (forSale !== null && forSale <= 5) score += 25;

  if (want >= 1000) score += 30;
  else if (want >= 500) score += 25;
  else if (want >= 250) score += 18;

  if (have > 0 && want > have) score += 15;
  if (signal.includes("Rare")) score += 20;
  if (signal.includes("Demand")) score += 15;
  if (signal.includes("Supply")) score += 12;

  return Math.min(100, Math.round(score));
}

function urlReleaseId(url: string | null | undefined) {
  const match = String(url || "").match(/\/release\/(\d+)/);
  return match?.[1] || null;
}

export default async function DailyBriefingPage() {
  const userSupabase = await createClient();

  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const supabase = createAdminClient();

  const [{ data: recordsData }, { data: observationsData }, { data: movementData }] =
    await Promise.all([
      supabase
        .from("records_clean_safe")
        .select(`
          id,
          artist,
          artist_canonical,
          estimated_value,
          market_consensus_value,
          discogs_release_id,
          discogs_url,
          cover_url,
          discogs_image_url,
          discogs_median_price,
          market_median_price
        `)
        .eq("user_id", user.id)
        .limit(10000),

      supabase
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
        .limit(100),

      supabase
        .from("market_observation_movement")
        .select(`
          id,
          artist_name,
          release_title,
          marketplace_for_sale,
          previous_for_sale,
          for_sale_change,
          want_count,
          previous_want_count,
          want_change,
          lowest_price,
          previous_lowest_price,
          price_change,
          movement_signal
        `)
        .order("observed_at", { ascending: false })
        .limit(50),
    ]);

  const records = (recordsData || []) as RecordRow[];
  const observations = ((observationsData || []) as Observation[])
    .map((item) => ({ ...item, score: scoreObservation(item) }))
    .sort((a, b) => b.score - a.score);

  const movements = (movementData || []) as Movement[];

  const totalValue = records.reduce(
    (sum, record) => sum + consensusValue(record),
    0,
  );

  const artistTotals = new Map<string, { records: number; value: number }>();

  records.forEach((record) => {
    const artist = record.artist_canonical || record.artist || "Unknown";
    const current = artistTotals.get(artist) || { records: 0, value: 0 };

    artistTotals.set(artist, {
      records: current.records + 1,
      value: current.value + consensusValue(record),
    });
  });

  const topArtist = Array.from(artistTotals.entries())
    .map(([artist, row]) => ({ artist, ...row }))
    .sort((a, b) => b.value - a.value)[0];

  const missingDiscogsIds = records.filter((record) => !String(record.discogs_release_id || "").trim()).length;
  const urlIdMismatches = records.filter((record) => {
    const parsed = urlReleaseId(record.discogs_url);
    if (!parsed) return false;
    return String(record.discogs_release_id || "").trim() !== parsed;
  }).length;
  const valueMismatches = records.filter((record) => hasMarketVariance(record)).length;
  const missingCovers = records.filter((record) => !record.cover_url && !record.discogs_image_url).length;

  const criticalIntegrityIssues =
    missingDiscogsIds + urlIdMismatches + valueMismatches;

  const healthScore = Math.max(
    0,
    Math.round(100 - Math.min(100, (criticalIntegrityIssues / Math.max(records.length || 1, 1)) * 100)),
  );

  const topObservation = observations[0];
  const topMovement = movements.find((movement) => movement.movement_signal !== "New Observation") || movements[0];

  const recommendedAction =
    valueMismatches > 0
      ? "Review market variance records before trusting portfolio totals."
      : urlIdMismatches > 0
        ? "Repair Discogs URL and release ID mismatches before refreshing market data."
        : topObservation?.score >= 85
          ? `Review ${topObservation.artist_name} — ${topObservation.release_title || "top opportunity"} in Acquisition Radar.`
          : missingCovers > 25
            ? "Review missing cover art to improve collection quality and visual confidence."
            : "Review Operations Center and Acquisition Radar before making new purchases.";

  return (
    <main className="min-h-screen bg-[#050403] px-6 py-8 text-[#F4EFE6] lg:px-10">
      <CINavigation />

      <div className="mx-auto flex max-w-[1700px] flex-col gap-8">
        <section className="rounded-[44px] border border-[#3A2A14] bg-[radial-gradient(circle_at_top_left,rgba(255,210,30,0.2),transparent_34%),linear-gradient(135deg,#170F08,#060403_54%,#130B05)] p-9 shadow-[0_24px_100px_rgba(0,0,0,.72)]">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#F4CD68]">
            Daily Collector Briefing
          </p>

          <h1 className="mt-5 text-5xl font-black tracking-tight md:text-7xl">
            What Matters <span className="text-[#FFD21E]">Today</span>
          </h1>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-[#B8AA96]">
            A synthesized daily command brief combining portfolio health,
            external market observations, acquisition signals, movement tracking,
            and integrity status.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Kpi label="Records" value={String(records.length)} />
          <Kpi label="Portfolio Value" value={money(totalValue)} />
          <Kpi label="Health Score" value={`${healthScore}%`} />
          <Kpi label="Market Signals" value={String(observations.length)} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[38px] border border-amber-400/25 bg-amber-400/[0.07] p-7">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-amber-100">
              Today's Action Center
            </p>

            <h2 className="mt-4 text-4xl font-black text-white">
              {valueMismatches > 0
                ? `${valueMismatches} valuation reviews needed`
                : urlIdMismatches > 0
                  ? `${urlIdMismatches} release ID repairs needed`
                  : missingCovers > 0
                    ? `${missingCovers} cover art gaps found`
                    : "No urgent collection actions"}
            </h2>

            <p className="mt-5 text-sm leading-7 text-[#F4EFE6]/80">
              {recommendedAction}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/collection/integrity-center"
                className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-5 py-3 text-sm font-black text-amber-100"
              >
                Open Integrity Center
              </Link>

              <Link
                href="/collection/value-queue"
                className="rounded-2xl border border-white/10 bg-black/25 px-5 py-3 text-sm font-black text-white"
              >
                Open Value Queue
              </Link>

              <Link
                href="/collection/acquisition-radar"
                className="rounded-2xl border border-white/10 bg-black/25 px-5 py-3 text-sm font-black text-white"
              >
                Acquisition Radar
              </Link>
            </div>
          </section>

          <section className="rounded-[38px] border border-[#D8B65A]/20 bg-[#D8B65A]/[0.06] p-7">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-[#F4CD68]">
              Recommended Action
            </p>

            <h2 className="mt-4 text-3xl font-black text-white">
              {recommendedAction}
            </h2>

            <p className="mt-5 text-sm leading-7 text-[#B8AA96]">
              This recommendation is generated from current market observations,
              data integrity status, and acquisition opportunity scoring.
            </p>
          </section>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <BriefCard
            title="Portfolio Snapshot"
            eyebrow="Collection"
            lines={[
              `${records.length.toLocaleString()} records tracked`,
              `${money(totalValue)} market consensus portfolio value`,
              topArtist
                ? `${topArtist.artist} leads value exposure at ${money(topArtist.value)}`
                : "No artist exposure calculated",
            ]}
            href="/collection/valuation-explorer"
            action="Open Valuation Explorer"
          />

          <BriefCard
            title="Market Movement"
            eyebrow="External Signals"
            lines={[
              topMovement
                ? `${topMovement.movement_signal}: ${topMovement.artist_name}`
                : "No movement records yet",
              topMovement?.release_title || "Movement will appear after multiple observation batches",
              topMovement
                ? `For sale ${topMovement.previous_for_sale ?? "—"} → ${topMovement.marketplace_for_sale ?? "—"}`
                : "Awaiting next observation cycle",
            ]}
            href="/collection/operations-center"
            action="Open Operations Center"
          />

          <BriefCard
            title="Integrity Status"
            eyebrow="Database Health"
            lines={[
              `${healthScore}% health score`,
              `${valueMismatches} market variance records`,
              `${urlIdMismatches} URL / ID mismatches`,
              `${missingCovers} records missing cover art`,
            ]}
            href="/collection/integrity-center"
            action="Open Integrity Center"
          />
        </section>

        <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D8B65A]">
            Favorite Artist Activity
          </p>

          <h2 className="mt-3 text-3xl font-black text-white">
            Latest Market Observations
          </h2>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {observations.slice(0, 8).map((observation) => (
              <article
                key={observation.id}
                className="rounded-[28px] border border-white/10 bg-black/25 p-5"
              >
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#D8B65A]">
                  {observation.signal_type || "Market Observation"}
                </p>

                <h3 className="mt-2 text-2xl font-black text-white">
                  {observation.artist_name}
                </h3>

                <p className="mt-2 text-lg font-black text-[#F4EFE6]">
                  {observation.release_title || "Untitled Release"}
                </p>

                <p className="mt-3 text-sm leading-7 text-[#B8AA96]">
                  {observation.marketplace_for_sale ?? "—"} for sale · {observation.want_count ?? "—"} want · score {observation.score}
                </p>
              </article>
            ))}
          </div>
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
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function BriefCard({
  eyebrow,
  title,
  lines,
  href,
  action,
}: {
  eyebrow: string;
  title: string;
  lines: string[];
  href: string;
  action: string;
}) {
  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D8B65A]">
        {eyebrow}
      </p>

      <h2 className="mt-3 text-2xl font-black text-white">{title}</h2>

      <div className="mt-5 grid gap-3">
        {lines.map((line) => (
          <div
            key={line}
            className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-[#D8CDBE]"
          >
            {line}
          </div>
        ))}
      </div>

      <Link
        href={href}
        className="mt-5 inline-flex rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-3 text-sm font-black text-cyan-100"
      >
        {action}
      </Link>
    </section>
  );
}
