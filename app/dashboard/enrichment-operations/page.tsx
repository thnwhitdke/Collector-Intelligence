"use client";

import CINavigation from "@/app/components/CINavigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Database,
  Gauge,
  Layers3,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

type OpsData = {
  ok: boolean;
  generatedAt: string;
  counts: {
    records: number;
    marketHistory: number;
    marketTrends: number;
    salesSummaries: number;
    normalizedSales: number;
    releaseTracks: number;
    artists: number;
    styles: number;
    genres: number;
  };
  iqHealth: {
    maxIq: number;
    averageIq: number;
    over100Count: number;
    missingIqCount: number;
  };
  portfolioTrend: {
    snapshotCount: number;
    firstValue: number;
    previousValue: number;
    latestValue: number;
    deltaFromPrevious: number;
    percentFromPrevious: number;
    deltaFromFirst: number;
    percentFromFirst: number;
    previousIq: number;
    latestIq: number;
    iqDeltaFromPrevious: number;
    direction: "up" | "down" | "flat";
    health: "Bullish" | "Stable" | "Bearish";
  } | null;
  topMovers: Array<{
    record_id: number;
    market_momentum: number | null;
    signal_label: string | null;
    signal_strength: string | null;
    price_delta_percent: number | null;
    supply_delta_percent: number | null;
    calculated_at: string | null;
    record?: {
      id: number;
      artist: string | null;
      title: string | null;
      estimated_value: number | string | null;
    } | null;
  }>;
  topIq: Array<{
    id: number;
    artist: string | null;
    title: string | null;
    estimated_value: number | string | null;
    collector_iq_score: number | null;
    rarity_score: number | null;
    market_momentum: string | null;
  }>;
};

function MetricCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <div className="min-h-[170px] rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="min-h-[40px] text-sm leading-snug text-zinc-400">{title}</p>
          <h2 className="mt-3 break-words text-3xl font-black leading-tight text-white xl:text-4xl">{value}</h2>
          <p className="mt-2 text-sm leading-snug text-zinc-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-3 text-zinc-200">
          {icon}
        </div>
      </div>
    </div>
  );
}

function money(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n === 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function signedMoney(value: number | null | undefined) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n === 0) return "$0.00";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(n));
  return n > 0 ? `+${formatted}` : `-${formatted}`;
}

function signedPercent(value: number | null | undefined) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n === 0) return "0%";
  return n > 0 ? `+${n}%` : `${n}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

export default function EnrichmentOperationsDashboard() {
  const [loading, setLoading] = useState(true);
  const [ops, setOps] = useState<OpsData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/dashboard/intelligence-ops");

        if (response.ok) {
          setOps(await response.json());
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-10 text-white">
        <div className="animate-pulse space-y-6">
          <div className="h-12 w-96 rounded bg-zinc-900" />
          <div className="grid gap-6 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-36 rounded-3xl bg-zinc-900" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const systemHealthy = (ops?.iqHealth.over100Count ?? 0) === 0;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <CINavigation />

        <section className="mt-8 rounded-[2rem] border border-cyan-500/10 bg-gradient-to-br from-[#071b2b] to-[#090b12] p-8 shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">
                Collector Intelligence OS
              </p>
              <h1 className="mt-3 text-5xl font-black tracking-tight">
                Intelligence Operations Center
              </h1>
              <p className="mt-4 max-w-3xl text-zinc-400">
                Live telemetry for the Collector Intelligence moat: market
                memory, trend signals, sales intelligence, portfolio health,
                track coverage, and Collector IQ integrity.
              </p>
            </div>

            <div
              className={`rounded-3xl border px-6 py-4 ${
                systemHealthy
                  ? "border-emerald-500/20 bg-emerald-500/10"
                  : "border-amber-500/20 bg-amber-500/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck
                  className={`h-6 w-6 ${
                    systemHealthy ? "text-emerald-400" : "text-amber-400"
                  }`}
                />
                <div>
                  <p className="text-sm text-zinc-400">System Health</p>
                  <p className="text-xl font-bold">
                    {systemHealthy ? "Operational" : "Needs Review"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            title="Market Sync"
            value={ops?.counts.marketHistory ?? 0}
            subtitle="Snapshots captured every 3 hours"
            icon={<Database className="h-6 w-6" />}
          />
          <MetricCard
            title="Market Trends"
            value={ops?.counts.marketTrends ?? 0}
            subtitle="Calculated 15 minutes after sync"
            icon={<TrendingUp className="h-6 w-6" />}
          />
          <MetricCard
            title="Sales Pipeline"
            value={ops?.counts.normalizedSales ?? 0}
            subtitle="Normalized comp observations"
            icon={<RefreshCcw className="h-6 w-6" />}
          />
          <MetricCard
            title="Sales Summary"
            value={ops?.counts.salesSummaries ?? 0}
            subtitle="Record-level sold-market intelligence"
            icon={<Sparkles className="h-6 w-6" />}
          />
          <MetricCard
            title="CI Recompute"
            value={systemHealthy ? "Healthy" : "Review"}
            subtitle="Runs after sales summary heartbeat"
            icon={<ShieldCheck className="h-6 w-6" />}
          />
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            title="Portfolio Value"
            value={money(ops?.portfolioTrend?.latestValue)}
            subtitle="Latest portfolio snapshot"
            icon={<Database className="h-6 w-6" />}
          />
          <MetricCard
            title="Value Change"
            value={signedMoney(ops?.portfolioTrend?.deltaFromPrevious)}
            subtitle={`${signedPercent(
              ops?.portfolioTrend?.percentFromPrevious
            )} since previous snapshot`}
            icon={<TrendingUp className="h-6 w-6" />}
          />
          <MetricCard
            title="Portfolio Health"
            value={ops?.portfolioTrend?.health ?? "Unknown"}
            subtitle={`Direction: ${ops?.portfolioTrend?.direction ?? "unknown"}`}
            icon={<ShieldCheck className="h-6 w-6" />}
          />
          <MetricCard
            title="Average IQ"
            value={ops?.portfolioTrend?.latestIq?.toFixed(2) ?? "—"}
            subtitle={`${ops?.portfolioTrend?.iqDeltaFromPrevious ?? 0} IQ since previous snapshot`}
            icon={<Gauge className="h-6 w-6" />}
          />
          <MetricCard
            title="Snapshots"
            value={ops?.portfolioTrend?.snapshotCount ?? 0}
            subtitle="Portfolio memory depth"
            icon={<Layers3 className="h-6 w-6" />}
          />
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Records"
            value={ops?.counts.records ?? 0}
            subtitle="Collection rows tracked"
            icon={<Database className="h-6 w-6" />}
          />
          <MetricCard
            title="Market Memory"
            value={ops?.counts.marketHistory ?? 0}
            subtitle="Historical market snapshots"
            icon={<Layers3 className="h-6 w-6" />}
          />
          <MetricCard
            title="Trend Signals"
            value={ops?.counts.marketTrends ?? 0}
            subtitle="Derived market movements"
            icon={<BarChart3 className="h-6 w-6" />}
          />
          <MetricCard
            title="Sales Summaries"
            value={ops?.counts.salesSummaries ?? 0}
            subtitle="Record-level sold comps"
            icon={<Sparkles className="h-6 w-6" />}
          />
          <MetricCard
            title="Normalized Sales"
            value={ops?.counts.normalizedSales ?? 0}
            subtitle="Cleaned comp observations"
            icon={<Activity className="h-6 w-6" />}
          />
          <MetricCard
            title="Release Tracks"
            value={ops?.counts.releaseTracks ?? 0}
            subtitle="Track intelligence rows"
            icon={<Gauge className="h-6 w-6" />}
          />
          <MetricCard
            title="Max IQ"
            value={ops?.iqHealth.maxIq ?? 0}
            subtitle="Collector IQ ceiling check"
            icon={<ShieldCheck className="h-6 w-6" />}
          />
          <MetricCard
            title="IQ Over 100"
            value={ops?.iqHealth.over100Count ?? 0}
            subtitle="Should always remain zero"
            icon={<AlertTriangle className="h-6 w-6" />}
          />
        </section>

        <section className="mt-8 grid gap-8 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-black">Top Market Signals</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Highest current momentum from market_trend_signals.
            </p>

            <div className="mt-6 space-y-3">
              {(ops?.topMovers ?? []).map((item) => (
                <div
                  key={`${item.record_id}-${item.calculated_at}`}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold">
                        {item.record?.title ?? `Record #${item.record_id}`}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {item.record?.artist ?? "Unknown Artist"} •{" "}
                        {item.signal_label ?? "Unknown"} •{" "}
                        {item.signal_strength ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">
                        Supply: {item.supply_delta_percent ?? 0}% • Price:{" "}
                        {item.price_delta_percent ?? 0}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black">
                        {item.market_momentum ?? 0}
                      </p>
                      <p className="text-xs text-zinc-500">momentum</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-black">Top Collector IQ</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Highest CI-native record scores after normalization.
            </p>

            <div className="mt-6 space-y-3">
              {(ops?.topIq ?? []).map((record) => (
                <div
                  key={record.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold">
                        {record.title ?? "Untitled"}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {record.artist ?? "Unknown Artist"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black">
                        {record.collector_iq_score ?? "—"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {money(record.estimated_value)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-6 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-cyan-300" />
            <h2 className="text-2xl font-bold">Live Intelligence Feed</h2>
          </div>

          <p className="mb-6 text-sm text-zinc-500">
            Real-time market, portfolio, and Collector IQ events generated by
            the Collector Intelligence intelligence layer.
          </p>

          <div className="space-y-4">
            {ops?.portfolioTrend && (
              <div className="rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-white">
                      Portfolio Snapshot Recorded
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Portfolio value is {money(ops.portfolioTrend.latestValue)}{" "}
                      with {ops.portfolioTrend.snapshotCount} snapshots in memory.
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Change since previous snapshot:{" "}
                      {signedMoney(ops.portfolioTrend.deltaFromPrevious)} /{" "}
                      {signedPercent(ops.portfolioTrend.percentFromPrevious)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-cyan-300">
                      {ops.portfolioTrend.health}
                    </p>
                    <p className="text-xs text-zinc-500">portfolio health</p>
                  </div>
                </div>
              </div>
            )}

            {ops?.topMovers?.[0] && (
              <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold">Strongest Market Signal</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {ops.topMovers[0].record?.artist ?? "Unknown Artist"} —{" "}
                      {ops.topMovers[0].record?.title ?? "Unknown Record"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Signal: {ops.topMovers[0].signal_label ?? "Unknown"} •{" "}
                      Strength: {ops.topMovers[0].signal_strength ?? "—"} •
                      Supply: {ops.topMovers[0].supply_delta_percent ?? 0}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-300">
                      {ops.topMovers[0].market_momentum ?? 0}
                    </p>
                    <p className="text-xs text-zinc-500">momentum</p>
                  </div>
                </div>
              </div>
            )}

            {ops?.topIq?.[0] && (
              <div className="rounded-2xl border border-purple-500/10 bg-purple-500/5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold">Highest Collector IQ</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {ops.topIq[0].artist ?? "Unknown Artist"} —{" "}
                      {ops.topIq[0].title ?? "Unknown Record"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Current estimated value: {money(ops.topIq[0].estimated_value)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-purple-300">
                      {ops.topIq[0].collector_iq_score}
                    </p>
                    <p className="text-xs text-zinc-500">collector IQ</p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold">Moat Engine Pulse</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Market memory, trend signals, sales summaries, track rows,
                    and portfolio snapshots are all feeding the CI OS.
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-white">
                    {formatDate(ops?.generatedAt)}
                  </p>
                  <p className="text-xs text-zinc-500">last generated</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
