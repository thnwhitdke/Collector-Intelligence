import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";

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

function money(value: number | string | null) {
  const numericValue =
    typeof value === "string" ? Number(value.replace(/[$,]/g, "")) : value;

  if (
    numericValue === null ||
    numericValue === undefined ||
    Number.isNaN(numericValue)
  ) {
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

function marketSignal(record: MarketRecord) {
  const forSale = record.discogs_for_sale;
  const lastSoldDays = daysSince(record.discogs_last_sold_date);

  if (forSale !== null && forSale <= 2) {
    return {
      label: "Thin Market",
      description: "Very few copies are currently listed. Scarcity may matter here.",
      className: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    };
  }

  if (forSale !== null && forSale >= 25) {
    return {
      label: "Saturated Market",
      description: "Many copies are listed. Pricing may need to be competitive.",
      className: "border-slate-400/30 bg-slate-400/10 text-slate-100",
    };
  }

  if (lastSoldDays !== null && lastSoldDays <= 45) {
    return {
      label: "Active Market",
      description: "Recent sales activity suggests current buyer interest.",
      className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    };
  }

  if (lastSoldDays !== null && lastSoldDays > 730) {
    return {
      label: "Quiet Market",
      description: "Last known sale is old. Value may be harder to prove quickly.",
      className: "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-100",
    };
  }

  return {
    label: "Monitor",
    description: "Market data is available, but no strong signal stands out yet.",
    className: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  };
}

export default async function MarketIntelligencePage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("records_clean")
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
    .limit(75);

  const records = (data ?? []) as MarketRecord[];

  const totalEstimatedValue = records.reduce((sum, record) => {
    const value =
      typeof record.estimated_value === "string"
        ? Number(record.estimated_value.replace(/[$,]/g, ""))
        : record.estimated_value;

    return sum + (Number.isFinite(value) ? value ?? 0 : 0);
  }, 0);

  const thinMarketCount = records.filter(
    (record) => record.discogs_for_sale !== null && record.discogs_for_sale <= 2
  ).length;

  const activeMarketCount = records.filter((record) => {
    const days = daysSince(record.discogs_last_sold_date);
    return days !== null && days <= 45;
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
                Discogs value range, current supply, last sold activity, and collector-grade market signals.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/collection" className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                ← Back to Collection
              </Link>
              <Link href="/collection/value-dashboard" className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20">
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

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
              Estimated Value Shown
            </p>
            <p className="mt-3 text-3xl font-black text-white">{money(totalEstimatedValue)}</p>
          </div>

          <div className="rounded-[2rem] border border-amber-400/20 bg-amber-400/[0.06] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-200/80">
              Thin Markets
            </p>
            <p className="mt-3 text-3xl font-black text-white">{thinMarketCount}</p>
          </div>

          <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/[0.06] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200/80">
              Active Markets
            </p>
            <p className="mt-3 text-3xl font-black text-white">{activeMarketCount}</p>
          </div>
        </section>

        <section className="grid gap-5">
          {records.map((record) => {
            const signal = marketSignal(record);
            const lastSoldDays = daysSince(record.discogs_last_sold_date);

            return (
              <article key={record.id} className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-xl">
                <div className="grid md:grid-cols-[150px_1fr]">
                  <div className="bg-black/30 p-4">
                    <div className="aspect-square overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                      {record.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={record.cover_url} alt={`${record.artist ?? "Unknown artist"} - ${record.title ?? "Untitled"}`} className="h-full w-full object-cover" />
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
                        <h2 className="text-2xl font-black text-white">{record.title ?? "Untitled Record"}</h2>
                        <p className="mt-1 text-sm font-semibold text-cyan-200">{record.artist ?? "Unknown Artist"}</p>
                        <p className="mt-2 text-sm text-slate-400">
                          {[record.label, record.year_released, record.format].filter(Boolean).join(" • ") || "No label/year/format metadata"}
                        </p>
                      </div>

                      <div className={`rounded-2xl border px-4 py-3 text-sm ${signal.className}`}>
                        <p className="font-bold">{signal.label}</p>
                        <p className="mt-1 max-w-sm text-xs opacity-80">{signal.description}</p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-6">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Estimated</p>
                        <p className="mt-2 text-xl font-black text-white">{money(record.estimated_value)}</p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Low</p>
                        <p className="mt-2 text-lg font-bold text-slate-100">{money(record.discogs_low_price)}</p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Median</p>
                        <p className="mt-2 text-lg font-bold text-slate-100">{money(record.discogs_median_price)}</p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">High</p>
                        <p className="mt-2 text-lg font-bold text-slate-100">{money(record.discogs_high_price)}</p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">For Sale</p>
                        <p className="mt-2 text-lg font-bold text-white">
                          {record.discogs_for_sale ?? "—"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Last Sold</p>
                        <p className="mt-2 text-sm font-bold text-white">
                          {formatDate(record.discogs_last_sold_date)}
                        </p>
                        {lastSoldDays !== null ? (
                          <p className="mt-1 text-xs text-slate-500">{lastSoldDays} days ago</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-5 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
                      <div>
                        <span className="text-slate-500">Source:</span>{" "}
                        <span className="text-slate-300">{record.value_source ?? "Unknown"}</span>{" "}
                        <span className="px-2 text-slate-600">•</span>
                        <span className="text-slate-500">Updated:</span>{" "}
                        <span className="text-slate-300">{formatDate(record.value_last_updated)}</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link href={`/collection/${record.id}`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
                          Open Record
                        </Link>

                        {record.discogs_url ? (
                          <a href={record.discogs_url} target="_blank" rel="noreferrer" className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20">
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
