import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";
import DiscogsValuePullButton from "./DiscogsValuePullButton";

type PriceHistoryEntry = {
  date: string;
  low: number;
  median: number;
  high: number;
  estimated: number;
  source: string;
};

type ValueRecord = {
  id: string;
  artist: string | null;
  title: string | null;
  format: string | null;
  purchase_price: number | null;
  estimated_value: number | null;
  discogs_low_price: number | null;
  discogs_median_price: number | null;
  discogs_high_price: number | null;
  value_source: string | null;
  value_last_updated: string | null;
  price_history: PriceHistoryEntry[] | null;
};

type EnrichedValueRecord = ValueRecord & {
  value_delta: number;
  roi_percent: number | null;
  trend_direction: "Rising" | "Falling" | "Stable" | "New";
  trend_delta: number | null;
};

function currency(value: number | null | undefined) {
  if (typeof value !== "number") return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function percent(value: number | null | undefined) {
  if (typeof value !== "number") return "—";

  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatDate(value: string | null) {
  if (!value) return "Not updated";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function normalizePriceHistory(
  value: PriceHistoryEntry[] | null
): PriceHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (entry) =>
        typeof entry.date === "string" &&
        typeof entry.estimated === "number"
    )
    .sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
}

function getTrendFromHistory(history: PriceHistoryEntry[]) {
  if (history.length < 2) {
    return {
      trend_direction: "New" as const,
      trend_delta: null,
    };
  }

  const first = history[0].estimated;
  const last = history[history.length - 1].estimated;
  const delta = Number((last - first).toFixed(2));

  if (Math.abs(delta) < 0.5) {
    return {
      trend_direction: "Stable" as const,
      trend_delta: delta,
    };
  }

  return {
    trend_direction: delta > 0 ? ("Rising" as const) : ("Falling" as const),
    trend_delta: delta,
  };
}

function enrichRecord(record: ValueRecord): EnrichedValueRecord {
  const purchase = record.purchase_price || 0;
  const estimated = record.estimated_value || 0;
  const valueDelta = estimated - purchase;
  const history = normalizePriceHistory(record.price_history);
  const trend = getTrendFromHistory(history);

  const roiPercent =
    purchase > 0 ? Number(((valueDelta / purchase) * 100).toFixed(1)) : null;

  return {
    ...record,
    price_history: history,
    value_delta: Number(valueDelta.toFixed(2)),
    roi_percent: roiPercent,
    trend_direction: trend.trend_direction,
    trend_delta: trend.trend_delta,
  };
}

function Sparkline({ history }: { history: PriceHistoryEntry[] | null }) {
  const safeHistory = normalizePriceHistory(history);

  if (safeHistory.length < 2) {
    return <span className="text-xs text-slate-500">No trend yet</span>;
  }

  const values = safeHistory.map((entry) => entry.estimated);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((value, index) => {
      const x =
        safeHistory.length === 1
          ? 0
          : (index / (safeHistory.length - 1)) * 120;
      const y = 36 - ((value - min) / range) * 32;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const lastValue = values[values.length - 1];
  const firstValue = values[0];
  const positive = lastValue >= firstValue;

  return (
    <div className="flex flex-col items-end gap-1">
      <svg
        width="120"
        height="40"
        viewBox="0 0 120 40"
        role="img"
        aria-label="Price trend sparkline"
        className="overflow-visible"
      >
        <polyline
          points={points}
          fill="none"
          stroke={positive ? "#6ee7b7" : "#fda4af"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span className="text-xs text-slate-500">
        {safeHistory.length} value points
      </span>
    </div>
  );
}

function TrendBadge({ record }: { record: EnrichedValueRecord }) {
  const styles = {
    Rising: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    Falling: "border-rose-400/40 bg-rose-400/10 text-rose-300",
    Stable: "border-slate-400/40 bg-slate-400/10 text-slate-300",
    New: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  };

  return (
    <div
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${styles[record.trend_direction]}`}
    >
      {record.trend_direction}
      {typeof record.trend_delta === "number"
        ? ` ${currency(record.trend_delta)}`
        : ""}
    </div>
  );
}

function MiniRecordCard({
  record,
  label,
}: {
  record: EnrichedValueRecord;
  label: string;
}) {
  const positive = record.value_delta >= 0;

  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-950/75 p-5 shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>

      <div className="mt-4">
        <p className="line-clamp-1 text-base font-bold text-slate-50">
          {record.artist || "Unknown Artist"}
        </p>
        <p className="line-clamp-1 text-sm text-slate-400">
          {record.title || "Untitled"}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <TrendBadge record={record} />
        <Sparkline history={record.price_history} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
            Estimated
          </p>
          <p className="mt-1 font-bold text-amber-200">
            {currency(record.estimated_value)}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
            Delta
          </p>
          <p
            className={`mt-1 font-bold ${
              positive ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {currency(record.value_delta)}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
            Purchase
          </p>
          <p className="mt-1 text-slate-300">
            {currency(record.purchase_price)}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
            ROI
          </p>
          <p
            className={`mt-1 font-semibold ${
              positive ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {percent(record.roi_percent)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function ValueDashboardPage() {
  const supabase = await createClient();

  const { data: records } = await supabase
    .from("records_clean_safe")
    .select(
      "id, artist, title, format, purchase_price, estimated_value, discogs_low_price, discogs_median_price, discogs_high_price, value_source, value_last_updated, price_history"
    )
    .order("estimated_value", { ascending: false, nullsFirst: false })
    .limit(150);

  const safeRecords = ((records || []) as ValueRecord[]).map(enrichRecord);

  const totalEstimatedValue = safeRecords.reduce(
    (sum, record) => sum + (record.estimated_value || 0),
    0
  );

  const totalPurchaseValue = safeRecords.reduce(
    (sum, record) => sum + (record.purchase_price || 0),
    0
  );

  const valueDelta = totalEstimatedValue - totalPurchaseValue;

  const roiOverall =
    totalPurchaseValue > 0
      ? Number(((valueDelta / totalPurchaseValue) * 100).toFixed(1))
      : null;

  const valuedCount = safeRecords.filter(
    (record) => typeof record.estimated_value === "number"
  ).length;

  const needsValueCount = safeRecords.filter(
    (record) => record.estimated_value === null
  ).length;

  const recordsWithPurchaseAndValue = safeRecords.filter(
    (record) =>
      typeof record.estimated_value === "number" &&
      typeof record.purchase_price === "number" &&
      record.purchase_price > 0
  );

  const topGainers = [...recordsWithPurchaseAndValue]
    .sort((a, b) => b.value_delta - a.value_delta)
    .slice(0, 3);

  const topLosers = [...recordsWithPurchaseAndValue]
    .sort((a, b) => a.value_delta - b.value_delta)
    .slice(0, 3);

  const topRoi = [...recordsWithPurchaseAndValue]
    .filter((record) => typeof record.roi_percent === "number")
    .sort((a, b) => (b.roi_percent || 0) - (a.roi_percent || 0))
    .slice(0, 3);

  const risingCount = safeRecords.filter(
    (record) => record.trend_direction === "Rising"
  ).length;

  const fallingCount = safeRecords.filter(
    (record) => record.trend_direction === "Falling"
  ).length;

  const stableCount = safeRecords.filter(
    (record) => record.trend_direction === "Stable"
  ).length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_35%),linear-gradient(135deg,_#020617,_#0f172a_45%,_#111827)] px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-5 rounded-3xl border border-slate-700/70 bg-slate-950/70 p-6 shadow-2xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">
              Collector Intelligence
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-50 md:text-5xl">
              Collection Value Dashboard
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
              Track estimated collection value, purchase basis, Discogs-derived
              pricing, profit/loss movement, ROI, and price trend history.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/collection"
              className="rounded-2xl border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-amber-300 hover:text-amber-200"
            >
              ← Collection
            </Link>

            <Link
              href="/collection/value-queue"
              className="rounded-2xl border border-amber-300/50 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-300 hover:text-slate-950"
            >
              Value Queue
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-5">
          <div className="rounded-3xl border border-slate-700 bg-slate-950/70 p-5 shadow-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Estimated Value
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-50">
              {currency(totalEstimatedValue)}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-700 bg-slate-950/70 p-5 shadow-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Purchase Basis
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-50">
              {currency(totalPurchaseValue)}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-700 bg-slate-950/70 p-5 shadow-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Value Delta
            </p>
            <p
              className={`mt-3 text-3xl font-bold ${
                valueDelta >= 0 ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {currency(valueDelta)}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-700 bg-slate-950/70 p-5 shadow-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Overall ROI
            </p>
            <p
              className={`mt-3 text-3xl font-bold ${
                valueDelta >= 0 ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {percent(roiOverall)}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-700 bg-slate-950/70 p-5 shadow-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Valuation Progress
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-50">
              {valuedCount}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {needsValueCount} still need values
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5 shadow-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">
              Rising
            </p>
            <p className="mt-3 text-3xl font-bold text-emerald-200">
              {risingCount}
            </p>
          </div>

          <div className="rounded-3xl border border-rose-400/20 bg-rose-400/10 p-5 shadow-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-rose-300">
              Falling
            </p>
            <p className="mt-3 text-3xl font-bold text-rose-200">
              {fallingCount}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-500/30 bg-slate-800/40 p-5 shadow-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-300">
              Stable
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-100">
              {stableCount}
            </p>
          </div>
        </section>

        <DiscogsValuePullButton />

        <section className="rounded-3xl border border-slate-700 bg-slate-950/70 p-6 shadow-2xl">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">
              Value Intelligence
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-50">
              Profit, Loss, ROI, and Trend Signals
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              These cards compare purchase price against current estimated
              value and now include sparkline movement from stored price
              history.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">
                Top Gainers
              </h3>
              <div className="space-y-4">
                {topGainers.length > 0 ? (
                  topGainers.map((record) => (
                    <MiniRecordCard
                      key={record.id}
                      record={record}
                      label="Gain Signal"
                    />
                  ))
                ) : (
                  <div className="rounded-3xl border border-slate-700 bg-slate-950/75 p-5 text-sm text-slate-400">
                    No gain signals yet. Add purchase prices and estimated
                    values to activate this section.
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-rose-300">
                Watchlist Losses
              </h3>
              <div className="space-y-4">
                {topLosers.length > 0 ? (
                  topLosers.map((record) => (
                    <MiniRecordCard
                      key={record.id}
                      record={record}
                      label="Loss Signal"
                    />
                  ))
                ) : (
                  <div className="rounded-3xl border border-slate-700 bg-slate-950/75 p-5 text-sm text-slate-400">
                    No loss signals yet. This section appears once purchase and
                    value data are available.
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-amber-300">
                Best ROI
              </h3>
              <div className="space-y-4">
                {topRoi.length > 0 ? (
                  topRoi.map((record) => (
                    <MiniRecordCard
                      key={record.id}
                      record={record}
                      label="ROI Signal"
                    />
                  ))
                ) : (
                  <div className="rounded-3xl border border-slate-700 bg-slate-950/75 p-5 text-sm text-slate-400">
                    No ROI signals yet. ROI requires both purchase price and
                    estimated value.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-950/80 shadow-2xl">
          <div className="border-b border-slate-700 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-50">
              Top Valued Records
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Showing the first 150 records sorted by estimated value.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-5 py-4 text-left">Record</th>
                  <th className="px-5 py-4 text-left">Format</th>
                  <th className="px-5 py-4 text-right">Purchase</th>
                  <th className="px-5 py-4 text-right">Median</th>
                  <th className="px-5 py-4 text-right">Estimated</th>
                  <th className="px-5 py-4 text-right">Delta</th>
                  <th className="px-5 py-4 text-right">ROI</th>
                  <th className="px-5 py-4 text-right">Trend</th>
                  <th className="px-5 py-4 text-right">Sparkline</th>
                  <th className="px-5 py-4 text-left">Source</th>
                  <th className="px-5 py-4 text-left">Updated</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {safeRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="transition hover:bg-slate-900/80"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-100">
                        {record.artist || "Unknown Artist"}
                      </div>
                      <div className="text-slate-400">
                        {record.title || "Untitled"}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {record.format || "—"}
                    </td>

                    <td className="px-5 py-4 text-right text-slate-300">
                      {currency(record.purchase_price)}
                    </td>

                    <td className="px-5 py-4 text-right text-slate-300">
                      {currency(record.discogs_median_price)}
                    </td>

                    <td className="px-5 py-4 text-right font-bold text-amber-200">
                      {currency(record.estimated_value)}
                    </td>

                    <td
                      className={`px-5 py-4 text-right font-bold ${
                        record.value_delta >= 0
                          ? "text-emerald-300"
                          : "text-rose-300"
                      }`}
                    >
                      {currency(record.value_delta)}
                    </td>

                    <td
                      className={`px-5 py-4 text-right font-semibold ${
                        (record.roi_percent || 0) >= 0
                          ? "text-emerald-300"
                          : "text-rose-300"
                      }`}
                    >
                      {percent(record.roi_percent)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <TrendBadge record={record} />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Sparkline history={record.price_history} />
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {record.value_source || "—"}
                    </td>

                    <td className="px-5 py-4 text-slate-400">
                      {formatDate(record.value_last_updated)}
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