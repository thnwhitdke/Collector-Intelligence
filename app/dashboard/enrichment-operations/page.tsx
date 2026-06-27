export const dynamic = "force-dynamic"
export const revalidate = 0

import Link from "next/link"
import CINavigation from "@/app/components/CINavigation"
import { createAdminClient } from "@/src/lib/supabase/admin"

function num(value: unknown) {
  return Number(value || 0).toLocaleString()
}

function pct(part: number, whole: number) {
  if (!whole) return "0%"
  return `${((part / whole) * 100).toFixed(2)}%`
}

function Card({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string
  value: string
  helper: string
  tone?: "default" | "good" | "warn" | "cyan"
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-400/20 bg-emerald-400/[0.06]"
      : tone === "warn"
        ? "border-yellow-400/20 bg-yellow-400/[0.06]"
        : tone === "cyan"
          ? "border-cyan-400/20 bg-cyan-400/[0.06]"
          : "border-white/10 bg-[#111111]"

  return (
    <div className={`rounded-3xl border p-6 ${toneClass}`}>
      <div className="text-xs font-black uppercase tracking-[0.35em] text-[#8E8170]">{label}</div>
      <div className="mt-4 text-4xl font-black text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-[#B8AA96]">{helper}</div>
    </div>
  )
}

function ProgressBar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.max(3, Math.min(100, (value / Math.max(1, max)) * 100))

  return (
    <div>
      <div className="mb-2 flex justify-between gap-4 text-sm">
        <span className="font-bold text-white">{label}</span>
        <span className="text-[#B8AA96]">{num(value)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-yellow-300"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

export default async function EnrichmentOperationsPage() {
  const admin = createAdminClient()

  const [
    warehouseCount,
    warehouseMetrics,
    recordsCount,
    valueHistoryCount,
    externalCompsCount,
    trendSignalsCount,
    marketObservationsCount,
    popsikeQueuePending,
    popsikeQueueFailed,
    latestValueSnapshots,
  ] = await Promise.all([
    admin.from("release_reference").select("*", { count: "exact", head: true }),
    admin.from("release_warehouse_metrics").select("*").limit(1).maybeSingle(),
    admin.from("records_clean_safe").select("*", { count: "exact", head: true }),
    admin.from("value_history").select("*", { count: "exact", head: true }),
    admin.from("external_market_comps").select("*", { count: "exact", head: true }),
    admin.from("market_trend_signals").select("*", { count: "exact", head: true }),
    admin.from("market_observations").select("*", { count: "exact", head: true }),
    admin.from("external_market_comp_queue").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("external_market_comp_queue").select("*", { count: "exact", head: true }).eq("status", "failed"),
    admin.from("value_history").select("snapshot_date, created_at").order("created_at", { ascending: false }).limit(5),
  ])

  const metricWarehouse = Number(warehouseMetrics.data?.releases || 0)
  const actualWarehouse = warehouseCount.count || metricWarehouse || 0
  const warehouseTarget = 10_000_000
  const records = recordsCount.count || 0
  const valueHistory = valueHistoryCount.count || 0
  const comps = externalCompsCount.count || 0
  const trends = trendSignalsCount.count || 0
  const observations = marketObservationsCount.count || 0
  const pending = popsikeQueuePending.count || 0
  const failed = popsikeQueueFailed.count || 0

  const metricIsStale = actualWarehouse > metricWarehouse

  return (
    <main className="min-h-screen bg-[#090909] text-[#F4EFE6]">
      <CINavigation />

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        <section className="rounded-[2rem] border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.12] via-[#111111] to-black p-8 md:p-10">
          <div className="text-xs font-black uppercase tracking-[0.45em] text-cyan-300">
            Collector Intelligence Operations
          </div>
          <h1 className="mt-5 text-5xl font-black tracking-tight md:text-7xl">
            Live Operations <span className="text-cyan-300">Dashboard</span>
          </h1>
          <p className="mt-5 max-w-4xl text-base leading-7 text-[#B8AA96]">
            Worker health, warehouse growth, enrichment coverage, Popsike queue status, market intelligence volume,
            and whether visible UI metrics are current.
          </p>
        </section>

        {metricIsStale ? (
          <section className="rounded-3xl border border-yellow-400/25 bg-yellow-400/[0.08] p-6">
            <div className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300">Warehouse Metric Warning</div>
            <h2 className="mt-3 text-3xl font-black text-white">Dashboard warehouse metric is stale</h2>
            <p className="mt-3 text-sm leading-6 text-[#B8AA96]">
              Raw warehouse rows show {num(actualWarehouse)}, but release_warehouse_metrics shows {num(metricWarehouse)}.
              Refresh the warehouse metrics after imports so the UI no longer displays the older 5M value.
            </p>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <Card label="Warehouse Rows" value={num(actualWarehouse)} helper={`${pct(actualWarehouse, warehouseTarget)} of 10M target`} tone="cyan" />
          <Card label="UI Warehouse Metric" value={num(metricWarehouse)} helper={metricIsStale ? "Currently stale versus raw table" : "Matches or exceeds raw count"} tone={metricIsStale ? "warn" : "good"} />
          <Card label="Collection Records" value={num(records)} helper="Tracked user collection rows" />
          <Card label="Value History" value={num(valueHistory)} helper="Historical valuation snapshots" />
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Card label="External Comps" value={num(comps)} helper="Imported auction/market comps" tone="cyan" />
          <Card label="Trend Signals" value={num(trends)} helper="Computed market trend signals" />
          <Card label="Market Observations" value={num(observations)} helper="Favorite artist market observations" />
          <Card label="Popsike Pending" value={num(pending)} helper={`${num(failed)} failed queue rows`} tone={pending > 0 ? "warn" : "good"} />
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#111111] p-6">
          <div className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300">Throughput</div>
          <h2 className="mt-3 text-3xl font-black">Warehouse Progress</h2>
          <div className="mt-6 space-y-6">
            <ProgressBar label="Current warehouse rows" value={actualWarehouse} max={warehouseTarget} />
            <ProgressBar label="UI metric rows" value={metricWarehouse} max={warehouseTarget} />
            <ProgressBar label="External market comps" value={comps} max={Math.max(comps, 100000)} />
            <ProgressBar label="Market observations" value={observations} max={Math.max(observations, 1000)} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-[#111111] p-6">
            <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">Recommended Action</div>
            <h2 className="mt-3 text-2xl font-black">Refresh warehouse UI metrics</h2>
            <p className="mt-3 text-sm leading-6 text-[#B8AA96]">
              If the website still says 5M after a successful import, it means the summary layer needs refresh/recompute.
            </p>
            <div className="mt-5 rounded-2xl bg-black/40 p-4 font-mono text-xs text-cyan-100">
              npm run warehouse:refresh-metrics
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#111111] p-6">
            <div className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300">Latest Snapshots</div>
            <h2 className="mt-3 text-2xl font-black">Value History Activity</h2>
            <div className="mt-5 space-y-3">
              {(latestValueSnapshots.data || []).map((row: any, index: number) => (
                <div key={index} className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm">
                  <div className="font-bold text-white">{row.snapshot_date || "Snapshot"}</div>
                  <div className="text-[#8E8170]">{row.created_at ? new Date(row.created_at).toLocaleString() : "Unknown time"}</div>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="flex flex-wrap gap-3">
          <Link href="/collection/operations-center" className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-black text-cyan-100">
            Open Operations Center
          </Link>
          <Link href="/collection/intelligence" className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-5 py-3 text-sm font-black text-yellow-100">
            Open Intelligence
          </Link>
        </section>
      </div>
    </main>
  )
}
