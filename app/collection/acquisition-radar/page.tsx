import CINavigation from "@/app/components/CINavigation";
import { createAdminClient } from "@/src/lib/supabase/admin";

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

type RadarItem = Observation & {
  radar_score: number;
  recommendation: string;
};

function money(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function radarScore(item: Observation) {
  const want = item.want_count || 0;
  const have = item.have_count || 0;
  const forSale = item.marketplace_for_sale;
  const price = item.lowest_price || 0;
  const signal = String(item.signal_type || "");

  let score = 0;

  score += Math.min(35, want * 0.05);

  if (forSale === 0) score += 45;
  else if (forSale !== null && forSale <= 2) score += 35;
  else if (forSale !== null && forSale <= 5) score += 25;
  else if (forSale !== null && forSale <= 10) score += 10;

  if (have > 0 && want > have) score += 15;
  if (signal.includes("Rare")) score += 20;
  if (signal.includes("Demand")) score += 15;
  if (signal.includes("Supply")) score += 12;
  if (price >= 250) score += 8;

  return Math.min(100, Math.round(score));
}

function recommendation(score: number) {
  if (score >= 90) return "Immediate acquisition candidate";
  if (score >= 70) return "Active hunt target";
  if (score >= 50) return "Monitor closely";
  return "Low urgency watch";
}

function tone(score: number) {
  if (score >= 90) return "border-red-500/30 bg-red-500/[0.09] text-red-100";
  if (score >= 70) return "border-orange-500/30 bg-orange-500/[0.09] text-orange-100";
  if (score >= 50) return "border-fuchsia-500/25 bg-fuchsia-500/[0.08] text-fuchsia-100";
  return "border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-100";
}

export default async function AcquisitionRadarPage() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
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
    .limit(100);

  const items = ((data || []) as Observation[])
    .map((item) => {
      const score = radarScore(item);
      return {
        ...item,
        radar_score: score,
        recommendation: recommendation(score),
      };
    })
    .sort((a, b) => b.radar_score - a.radar_score);

  const critical = items.filter((item) => item.radar_score >= 90).slice(0, 8);
  const active = items.filter((item) => item.radar_score >= 70 && item.radar_score < 90).slice(0, 8);
  const monitor = items.filter((item) => item.radar_score < 70).slice(0, 8);

  const top = items[0];

  return (
    <main className="min-h-screen bg-[#050403] px-6 py-8 text-[#F4EFE6] lg:px-10">
      <CINavigation />

      <div className="mx-auto flex max-w-[1800px] flex-col gap-8">
        <section className="rounded-[44px] border border-[#3A2A14] bg-[radial-gradient(circle_at_top_left,rgba(255,210,30,0.18),transparent_34%),linear-gradient(135deg,#170F08,#060403_54%,#130B05)] p-9 shadow-[0_24px_100px_rgba(0,0,0,.72)]">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#F4CD68]">
            Collector Intelligence Acquisition Radar
          </p>

          <h1 className="mt-5 text-5xl font-black tracking-tight md:text-7xl">
            What Should I <span className="text-[#FFD21E]">Hunt?</span>
          </h1>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-[#B8AA96]">
            Ranked acquisition opportunities from favorite-artist market observations,
            scarcity, collector demand, supply pressure, and marketplace activity.
          </p>

          {top ? (
            <div className={`mt-8 rounded-[34px] border p-6 ${tone(top.radar_score)}`}>
              <p className="text-xs font-black uppercase tracking-[0.28em]">
                Top Opportunity
              </p>

              <h2 className="mt-3 text-4xl font-black text-white">
                {top.artist_name}
              </h2>

              <p className="mt-2 text-2xl font-black text-[#FFD21E]">
                {top.release_title || "Untitled Release"}
              </p>

              <p className="mt-4 text-sm leading-7 text-[#F4EFE6]/80">
                {top.recommendation}. {top.marketplace_for_sale ?? "—"} copies for sale · {top.want_count ?? "—"} want · lowest ask {money(top.lowest_price)}.
              </p>

              <div className="mt-5 inline-flex rounded-2xl border border-white/10 bg-black/30 px-5 py-4">
                <span className="text-xs uppercase tracking-[0.2em] text-[#B8AA96]">
                  Radar Score&nbsp;
                </span>
                <span className="text-2xl font-black text-white">
                  {top.radar_score}
                </span>
              </div>
            </div>
          ) : null}
        </section>

        {error ? (
          <div className="rounded-[28px] border border-red-500/25 bg-red-500/[0.08] p-6 text-red-100">
            {error.message}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <Kpi label="Critical" value={String(critical.length)} />
          <Kpi label="Active Hunt" value={String(active.length)} />
          <Kpi label="Monitor" value={String(monitor.length)} />
        </section>

        <RadarSection title="Critical Opportunities" subtitle="Score 90+" items={critical} />
        <RadarSection title="Active Hunt Targets" subtitle="Score 70–89" items={active} />
        <RadarSection title="Monitor Closely" subtitle="Below 70" items={monitor} />
      </div>
    </main>
  );
}

function RadarSection({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: RadarItem[];
}) {
  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D8B65A]">
        {subtitle}
      </p>

      <h2 className="mt-3 text-3xl font-black text-white">
        {title}
      </h2>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className={`rounded-[28px] border p-5 ${tone(item.radar_score)}`}>
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em]">
                  {item.signal_type || "Market Observation"}
                </p>

                <h3 className="mt-2 text-2xl font-black text-white">
                  {item.artist_name}
                </h3>

                <p className="mt-2 text-lg font-black text-[#F4EFE6]">
                  {item.release_title || "Untitled Release"}
                </p>

                <p className="mt-3 text-sm leading-7 text-[#D8CDBE]">
                  {item.recommendation}
                </p>

                <p className="mt-3 text-sm leading-7 text-[#D8CDBE]">
                  {item.marketplace_for_sale ?? "—"} for sale · {item.want_count ?? "—"} want · {item.have_count ?? "—"} have · lowest ask {money(item.lowest_price)}
                </p>
              </div>

              <div className="flex flex-col gap-2 md:items-end">
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-right">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#B8AA96]">
                    Score
                  </p>
                  <p className="mt-1 text-3xl font-black text-white">
                    {item.radar_score}
                  </p>
                </div>

                {item.discogs_release_id ? (
                  <a
                    href={`https://www.discogs.com/release/${item.discogs_release_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-black text-white"
                  >
                    Discogs
                  </a>
                ) : null}

                <a
                  href={`/collection?q=${encodeURIComponent(item.artist_name)}`}
                  className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-black text-cyan-100"
                >
                  Search Collection
                </a>
              </div>
            </div>
          </article>
        ))}

        {items.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 p-10 text-center text-[#B8AA96]">
            No records in this lane yet.
          </div>
        ) : null}
      </div>
    </section>
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
