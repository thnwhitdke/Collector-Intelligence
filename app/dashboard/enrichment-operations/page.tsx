"use client";

import CINavigation from "@/app/components/CINavigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  Gauge,
  Layers3,
  RefreshCcw,
  ServerCrash,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

type ActivityItem = {
  id: string;
  action?: string;
  status: string;
  created_at: string;
  metadata?: {
    canonical_display_title?: string;
    artwork?: string;
    thumbnail?: string;
    artist?: string;
    title?: string;
  };
};

type AnalyticsData = {
  totals: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    retryJobs: number;
    permanentFailures: number;
    successRate: number;
  };
  activity: ActivityItem[];
};

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
  topMovers: Array<{
    record_id: number;
    market_momentum: number | null;
    signal_label: string | null;
    signal_strength: string | null;
    price_delta_percent: number | null;
    supply_delta_percent: number | null;
    calculated_at: string | null;
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
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-400">{title}</p>
          <h2 className="mt-3 text-4xl font-black text-white">{value}</h2>
          <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-3 text-zinc-200">{icon}</div>
      </div>
    </div>
  );
}

function money(value: number | string | null) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export default function EnrichmentOperationsDashboard() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [ops, setOps] = useState<OpsData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [analyticsResponse, opsResponse] = await Promise.all([
          fetch("/api/dashboard/enrichment-analytics"),
          fetch("/api/dashboard/intelligence-ops"),
        ]);

        if (analyticsResponse.ok) {
          setAnalytics(await analyticsResponse.json());
        }

        if (opsResponse.ok) {
          setOps(await opsResponse.json());
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

  const systemHealthy =
    (analytics?.totals.failedJobs ?? 0) === 0 &&
    (ops?.iqHealth.over100Count ?? 0) === 0;

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
                Live operational telemetry for enrichment, market memory, sales
                intelligence, trend signals, track coverage, and Collector IQ health.
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
            title="Queue Throughput"
            value={analytics?.totals.completedJobs ?? 0}
            subtitle="Completed enrichment jobs"
            icon={<TrendingUp className="h-6 w-6" />}
          />
          <MetricCard
            title="Success Rate"
            value={`${analytics?.totals.successRate ?? 0}%`}
            subtitle="Pipeline completion efficiency"
            icon={<CheckCircle2 className="h-6 w-6" />}
          />
          <MetricCard
            title="Retries"
            value={analytics?.totals.retryJobs ?? 0}
            subtitle="Recovered failed executions"
            icon={<RefreshCcw className="h-6 w-6" />}
          />
          <MetricCard
            title="Failures"
            value={analytics?.totals.failedJobs ?? 0}
            subtitle="Current failed jobs"
            icon={<AlertTriangle className="h-6 w-6" />}
          />
          <MetricCard
            title="Permanent Failures"
            value={analytics?.totals.permanentFailures ?? 0}
            subtitle="Jobs requiring intervention"
            icon={<ServerCrash className="h-6 w-6" />}
          />
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Records" value={ops?.counts.records ?? 0} subtitle="Collection rows tracked" icon={<Database className="h-6 w-6" />} />
          <MetricCard title="Market Memory" value={ops?.counts.marketHistory ?? 0} subtitle="Historical market snapshots" icon={<Layers3 className="h-6 w-6" />} />
          <MetricCard title="Trend Signals" value={ops?.counts.marketTrends ?? 0} subtitle="Derived market movements" icon={<BarChart3 className="h-6 w-6" />} />
          <MetricCard title="Sales Summaries" value={ops?.counts.salesSummaries ?? 0} subtitle="Record-level sold comps" icon={<Sparkles className="h-6 w-6" />} />
          <MetricCard title="Normalized Sales" value={ops?.counts.normalizedSales ?? 0} subtitle="Cleaned comp observations" icon={<Activity className="h-6 w-6" />} />
          <MetricCard title="Release Tracks" value={ops?.counts.releaseTracks ?? 0} subtitle="Track intelligence rows" icon={<Gauge className="h-6 w-6" />} />
          <MetricCard title="Max IQ" value={ops?.iqHealth.maxIq ?? 0} subtitle="Collector IQ ceiling check" icon={<ShieldCheck className="h-6 w-6" />} />
          <MetricCard title="IQ Over 100" value={ops?.iqHealth.over100Count ?? 0} subtitle="Should always remain zero" icon={<AlertTriangle className="h-6 w-6" />} />
        </section>

        <section className="mt-8 grid gap-8 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-2xl font-black">Top Market Signals</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Highest current momentum from market_trend_signals.
            </p>

            <div className="mt-6 space-y-3">
              {(ops?.topMovers ?? []).map((item) => (
                <div key={`${item.record_id}-${item.calculated_at}`} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold">Record #{item.record_id}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {item.signal_label ?? "Unknown"} • {item.signal_strength ?? "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black">{item.market_momentum ?? 0}</p>
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
                <div key={record.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold">{record.title ?? "Untitled"}</p>
                      <p className="mt-1 text-sm text-zinc-500">{record.artist ?? "Unknown Artist"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black">{record.collector_iq_score ?? "—"}</p>
                      <p className="text-xs text-zinc-500">{money(record.estimated_value)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-6 flex items-center gap-3">
            <Clock3 className="h-5 w-5 text-zinc-300" />
            <h2 className="text-2xl font-bold">Recent Enrichment Activity</h2>
          </div>

          <div className="space-y-4">
            {(analytics?.activity ?? []).length === 0 && (
              <p className="text-zinc-500">No recent activity found.</p>
            )}

            {(analytics?.activity ?? []).slice(0, 12).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/30 p-4">
                <div>
                  <p className="font-semibold text-white">
                    {item.action ?? item.metadata?.canonical_display_title ?? "Activity"}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-zinc-300">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
