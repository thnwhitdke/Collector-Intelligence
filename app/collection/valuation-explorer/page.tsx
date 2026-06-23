import CINavigation from "@/app/components/CINavigation";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<{ by?: string }>;

type RawRecord = {
  artist: string | null;
  artist_canonical: string | null;
  country: string | null;
  label: string | null;
  format: string | null;
  year_released: string | null;
  media_grade: string | null;
  sleeve_grade: string | null;
  estimated_value: string | null;
  market_consensus_value: string | number | null;
  discogs_median_price: string | number | null;
};

type Row = {
  category: string;
  records: number;
  total_value: number;
  avg_value: number;
  portfolio_share: number;
  value_density: number;
};

const dimensions = [
  { key: "artist", label: "Artist" },
  { key: "country", label: "Country" },
  { key: "label", label: "Label" },
  { key: "format", label: "Format" },
  { key: "decade", label: "Decade" },
  { key: "media_grade", label: "Media Grade" },
  { key: "sleeve_grade", label: "Sleeve Grade" },
];

function money(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function pct(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(1)}%`;
}

function numericValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function consensusValue(record: Pick<RawRecord, "market_consensus_value" | "estimated_value" | "discogs_median_price">) {
  const marketConsensus = numericValue(record.market_consensus_value);
  const estimated = numericValue(record.estimated_value);
  const discogsMedian = numericValue(record.discogs_median_price);

  if (marketConsensus > 0) return marketConsensus;
  if (estimated > 0) return estimated;
  if (discogsMedian > 0) return discogsMedian;

  return 0;
}

function decade(value: string | null | undefined) {
  if (!value) return "Unknown";
  const match = String(value).match(/\d{4}/);
  if (!match) return "Unknown";
  const year = Number(match[0]);
  if (!Number.isFinite(year)) return "Unknown";
  return `${Math.floor(year / 10) * 10}s`;
}

function categoryFor(record: RawRecord, by: string) {
  switch (by) {
    case "country":
      return record.country?.trim() || "Unknown";
    case "label":
      return record.label?.trim() || "Unknown";
    case "format":
      return record.format?.trim() || "Unknown";
    case "decade":
      return decade(record.year_released);
    case "media_grade":
      return record.media_grade?.trim() || "Unknown";
    case "sleeve_grade":
      return record.sleeve_grade?.trim() || "Unknown";
    case "artist":
    default:
      return record.artist_canonical?.trim() || record.artist?.trim() || "Unknown";
  }
}

export default async function ValuationExplorerPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const by = dimensions.some((dimension) => dimension.key === params.by)
    ? params.by || "artist"
    : "artist";

  const selected = dimensions.find((dimension) => dimension.key === by) || dimensions[0];

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase
    .from("records_clean_safe")
    .select(`
      artist,
      artist_canonical,
      country,
      label,
      format,
      year_released,
      media_grade,
      sleeve_grade,
      estimated_value,
      market_consensus_value,
      discogs_median_price
    `)
    .eq("user_id", user.id)
    .limit(10000);

  const records = (data || []) as RawRecord[];
  const grouped = new Map<string, { records: number; total: number }>();

  records.forEach((record) => {
    const category = categoryFor(record, by);
    const value = consensusValue(record);
    const current = grouped.get(category) || { records: 0, total: 0 };

    grouped.set(category, {
      records: current.records + 1,
      total: current.total + value,
    });
  });

  const grandTotal = Array.from(grouped.values()).reduce((sum, row) => sum + row.total, 0);

  const rows: Row[] = Array.from(grouped.entries())
    .map(([category, row]) => ({
      category,
      records: row.records,
      total_value: row.total,
      avg_value: row.records > 0 ? row.total / row.records : 0,
      value_density: row.records > 0 ? row.total / row.records : 0,
      portfolio_share: grandTotal > 0 ? (row.total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total_value - a.total_value)
    .slice(0, 75);

  const totalRecords = records.length;
  const top = rows[0];
  const topTen = rows.slice(0, 10);
  const hiddenValueLeaders = [...rows]
    .filter((row) => row.records <= 25)
    .sort((a, b) => b.avg_value - a.avg_value)
    .slice(0, 8);

  const diversificationScore =
    !top
      ? 0
      : top.portfolio_share >= 75
        ? 10
        : top.portfolio_share >= 50
          ? 30
          : top.portfolio_share >= 25
            ? 60
            : 90;

  const diversificationLabel =
    diversificationScore <= 25
      ? "Highly Concentrated"
      : diversificationScore <= 50
        ? "Concentrated"
        : diversificationScore <= 75
          ? "Balanced"
          : "Diversified";

  return (
    <main className="min-h-screen bg-[#050403] px-6 py-8 text-[#F4EFE6] lg:px-10">
      <CINavigation />

      <div className="mx-auto flex max-w-[1600px] flex-col gap-8">
        <section className="rounded-[44px] border border-[#3A2A14] bg-[radial-gradient(circle_at_top_left,rgba(255,210,30,0.18),transparent_34%),linear-gradient(135deg,#170F08,#060403_54%,#130B05)] p-9 shadow-[0_24px_100px_rgba(0,0,0,.72)]">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#F4CD68]">
            Portfolio Valuation Explorer
          </p>

          <h1 className="mt-5 text-5xl font-black tracking-tight md:text-7xl">
            Value by <span className="text-[#FFD21E]">{selected.label}</span>
          </h1>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-[#B8AA96]">
            See where portfolio value is concentrated, which segments dominate,
            and where hidden value exists across your collection.
          </p>

          <form className="mt-7 flex flex-wrap gap-3">
            <select
              name="by"
              defaultValue={by}
              className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm font-black text-white outline-none"
            >
              {dimensions.map((dimension) => (
                <option key={dimension.key} value={dimension.key}>
                  {dimension.label}
                </option>
              ))}
            </select>

            <button className="rounded-2xl bg-[#D8B65A] px-6 py-4 text-sm font-black text-black">
              Analyze
            </button>
          </form>
        </section>

        {error ? (
          <div className="rounded-[28px] border border-red-500/25 bg-red-500/[0.08] p-6 text-red-100">
            {error.message}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <Kpi label="Portfolio Value" value={money(grandTotal)} />
          <Kpi label="Records Analyzed" value={String(totalRecords)} />
          <Kpi label="Largest Exposure" value={top ? `${top.category} · ${pct(top.portfolio_share)}` : "—"} />
          <Kpi label="Diversification" value={diversificationLabel} />
        </section>

        <section className="rounded-[34px] border border-[#3A2A14] bg-[#0A0907] p-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#FFD21E]">
            Collector Intelligence Insight
          </p>

          <p className="mt-4 text-lg leading-8 text-[#D8CDBE]">
            {top ? (
              <>
                <span className="font-black text-white">{top.category}</span>{" "}
                represents{" "}
                <span className="font-black text-white">{pct(top.portfolio_share)}</span>{" "}
                of total portfolio value with{" "}
                <span className="font-black text-white">{top.records}</span>{" "}
                records contributing{" "}
                <span className="font-black text-[#FFD21E]">{money(top.total_value)}</span>.
              </>
            ) : (
              "Collector Intelligence is waiting for enough valuation data to generate a portfolio insight."
            )}
          </p>

          <p className="mt-4 text-[#B8AA96]">
            Portfolio diversification score:
            <span className="ml-2 font-black text-white">{diversificationScore}/100</span>
            {" · "}
            {diversificationLabel}
          </p>
        </section>

        <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#D8B65A]">
                Portfolio Concentration
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">
                Top 10 Value Drivers
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[#B8AA96]">
              This shows how much of your portfolio value is concentrated in the largest segments.
            </p>
          </div>

          <div className="mt-7 space-y-4">
            {topTen.map((row, index) => (
              <div key={row.category} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white">
                      {index + 1}. {row.category}
                    </p>
                    <p className="mt-1 text-xs text-[#8E8170]">
                      {row.records} records · {money(row.total_value)}
                    </p>
                  </div>
                  <p className="text-lg font-black text-[#FFD21E]">
                    {pct(row.portfolio_share)}
                  </p>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#FFD21E]"
                    style={{ width: `${Math.min(100, row.portfolio_share)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#D8B65A]">
              Top Contributors
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Portfolio Leaders
            </h2>

            <div className="mt-6 space-y-3">
              {rows.slice(0, 8).map((row) => (
                <Link
                  key={row.category}
                  href={`/collection?q=${encodeURIComponent(row.category)}`}
                  className="block rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-black text-white">{row.category}</p>
                      <p className="mt-1 text-xs text-[#8E8170]">
                        {row.records} records · Avg {money(row.avg_value)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-[#FFD21E]">{money(row.total_value)}</p>
                      <p className="text-xs text-[#B8AA96]">{pct(row.portfolio_share)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#D8B65A]">
              Hidden Value Leaders
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              High Average Value Segments
            </h2>

            <div className="mt-6 space-y-3">
              {hiddenValueLeaders.map((row) => (
                <Link
                  key={row.category}
                  href={`/collection?q=${encodeURIComponent(row.category)}`}
                  className="block rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-black text-white">{row.category}</p>
                      <p className="mt-1 text-xs text-[#8E8170]">
                        {row.records} records · {pct(row.portfolio_share)} portfolio share
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-[#FFD21E]">{money(row.avg_value)}</p>
                      <p className="text-xs text-[#B8AA96]">Avg value</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </section>

        <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#D8B65A]">
              Full Analysis
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Segment Valuation Table
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.22em] text-[#8E8170]">
                  <th className="px-4 py-2">{selected.label}</th>
                  <th className="px-4 py-2">Records</th>
                  <th className="px-4 py-2">Total Value</th>
                  <th className="px-4 py-2">Avg Value</th>
                  <th className="px-4 py-2">Value Density</th>
                  <th className="px-4 py-2">Portfolio Share</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.category} className="rounded-2xl bg-black/25 transition hover:bg-white/5">
                    <td className="rounded-l-2xl px-4 py-4 text-lg font-black text-white">
                      <Link href={`/collection?q=${encodeURIComponent(row.category)}`}>
                        {row.category}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-[#D8CDBE]">{row.records}</td>
                    <td className="px-4 py-4 font-black text-[#FFD21E]">
                      {money(row.total_value)}
                    </td>
                    <td className="px-4 py-4 text-[#D8CDBE]">{money(row.avg_value)}</td>
                    <td className="px-4 py-4 text-[#FFD21E]">{money(row.value_density)}</td>
                    <td className="rounded-r-2xl px-4 py-4 text-[#D8CDBE]">
                      {pct(row.portfolio_share)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
