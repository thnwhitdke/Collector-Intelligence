"use client";

import CINavigation from "@/app/components/CINavigation";

import { useEffect, useState, type ReactNode } from "react";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCcw,
  ServerCrash,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";

type ActivityItem = {

  id: string;

  action?: string;

  status: string;

  created_at: string;

  metadata?: {

    canonical_display_title?: string;

    artwork?: string;

    thumbnail?: string;

    year?: number;

    genre?: string[];

    style?: string[];

    artist?: string;

    title?: string;

    country?: string;

    label?: string;

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

type MetricCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
};

function MetricCard({
  title,
  value,
  subtitle,
  icon,
}: MetricCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl shadow-xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-400">
            {title}
          </p>

          <h2 className="mt-3 text-4xl font-bold text-white">
            {value}
          </h2>

          <p className="mt-2 text-sm text-zinc-500">
            {subtitle}
          </p>
        </div>

        <div className="rounded-2xl bg-white/10 p-3 text-zinc-200">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function EnrichmentOperationsDashboard() {
  const [loading, setLoading] = useState<boolean>(true);

  const [analytics, setAnalytics] =
    useState<AnalyticsData | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const response = await fetch(
          "/api/dashboard/enrichment-analytics"
        );

        if (!response.ok) {
          throw new Error("Failed to load analytics");
        }

        const data: AnalyticsData =
          await response.json();

        setAnalytics(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-10 text-white">
        <div className="animate-pulse">
          <div className="mb-8 h-10 w-72 rounded bg-zinc-800" />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-40 rounded-3xl bg-zinc-900"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-black p-10 text-white">
        Failed to load analytics.
      </div>
    );
  }

  const throughputData = [
    {
      name: "Completed",
      value: analytics.totals.completedJobs,
    },
    {
      name: "Retries",
      value: analytics.totals.retryJobs,
    },
    {
      name: "Failed",
      value: analytics.totals.failedJobs,
    },
  ];

  const healthData = [
    {
      name: "Success Rate",
      value: analytics.totals.successRate,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
              Collector Intelligence
            </p>

            <h1 className="mt-3 text-5xl font-black tracking-tight">
              Enrichment Operations
            </h1>

            <p className="mt-4 max-w-2xl text-lg text-zinc-400">
              Autonomous telemetry and operational
              intelligence for the Collector Intelligence
              enrichment engine.
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />

              <div>
                <p className="text-sm text-emerald-300">
                  System Health
                </p>

                <p className="text-xl font-bold text-white">
                  Operational
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            title="Queue Throughput"
            value={analytics.totals.completedJobs}
            subtitle="Completed enrichment jobs"
            icon={<TrendingUp className="h-6 w-6" />}
          />

          <MetricCard
            title="Success Rate"
            value={`${analytics.totals.successRate}%`}
            subtitle="Pipeline completion efficiency"
            icon={<CheckCircle2 className="h-6 w-6" />}
          />

          <MetricCard
            title="Retries"
            value={analytics.totals.retryJobs}
            subtitle="Recovered failed executions"
            icon={<RefreshCcw className="h-6 w-6" />}
          />

          <MetricCard
            title="Failures"
            value={analytics.totals.failedJobs}
            subtitle="Current failed jobs"
            icon={<AlertTriangle className="h-6 w-6" />}
          />

          <MetricCard
            title="Permanent Failures"
            value={analytics.totals.permanentFailures}
            subtitle="Jobs requiring intervention"
            icon={<ServerCrash className="h-6 w-6" />}
          />
        </div>

        {/* Charts */}
        <div className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-2">
          {/* Throughput */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-6 flex items-center gap-3">
              <Activity className="h-5 w-5 text-zinc-300" />

              <h2 className="text-xl font-bold">
                Queue Throughput
              </h2>
            </div>

            <div className="h-[320px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart data={throughputData}>
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="name" />

                  <YAxis />

                  <Tooltip />

                  <Bar
                    dataKey="value"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Health */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-6 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-zinc-300" />

              <h2 className="text-xl font-bold">
                Operational Health
              </h2>
            </div>

            <div className="h-[320px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart data={healthData}>
                  <defs>
                    <linearGradient
                      id="colorHealth"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#22c55e"
                        stopOpacity={0.8}
                      />

                      <stop
                        offset="95%"
                        stopColor="#22c55e"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="name" />

                  <YAxis domain={[0, 100]} />

                  <Tooltip />

                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#22c55e"
                    fillOpacity={1}
                    fill="url(#colorHealth)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-6 flex items-center gap-3">
            <Clock3 className="h-5 w-5 text-zinc-300" />

            <h2 className="text-2xl font-bold">
              Recent Activity
            </h2>
          </div>

          <div className="space-y-4">
            {analytics.activity.length === 0 && (
              <p className="text-zinc-500">
                No recent activity found.
              </p>
            )}

            {analytics.activity.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/30 p-4"
              >
                <div>
                  <p className="font-semibold text-white">
                    {item.action}
                  </p>

                  <div className="flex items-center gap-4">

  {/* Artwork */}

  <div
    className="
      w-14
      h-14
      rounded-xl
      overflow-hidden
      bg-zinc-900
      border
      border-zinc-800
      flex-shrink-0
    "
  >

    {item.metadata?.artwork ? (

      <img
        src={item.metadata.artwork}
        alt="Album Artwork"
        className="
          w-full
          h-full
          object-cover
        "
      />

    ) : (

      <div
        className="
          w-full
          h-full
          flex
          items-center
          justify-center
          text-zinc-700
          text-xs
        "
      >
        N/A
      </div>

    )}

  </div>

  {/* Metadata */}

  <div>

    <p
      className="
        text-sm
        font-semibold
        text-white
      "
    >

      {item.metadata
        ?.canonical_display_title ||

        "Unknown Record"}

    </p>

    <div
      className="
        flex
        items-center
        gap-2
        mt-1
        flex-wrap
      "
    >

      {item.metadata?.year && (

        <span
          className="
            text-xs
            px-2
            py-1
            rounded-full
            bg-zinc-800
            text-zinc-300
          "
        >
          {item.metadata.year}
        </span>

      )}

      {item.metadata?.genre?.[0] && (

        <span
          className="
            text-xs
            px-2
            py-1
            rounded-full
            bg-emerald-950/40
            text-emerald-300
          "
        >
          {item.metadata.genre[0]}
        </span>

      )}

      {item.metadata?.style?.[0] && (

        <span
          className="
            text-xs
            px-2
            py-1
            rounded-full
            bg-purple-950/40
            text-purple-300
          "
        >
          {item.metadata.style[0]}
        </span>

      )}

    </div>

  </div>

</div>
                </div>

                <div className="text-right">
                 <div
  className={`
    text-xs
    px-3
    py-1
    rounded-full
    font-medium

    ${
      item.status === "success"
        ? "bg-emerald-950/40 text-emerald-300"
        : "bg-red-950/40 text-red-300"
    }
  `}
>

  {item.status === "success"
    ? "SUCCESS"
    : "ERROR"}

</div>

                  <p className="text-xs text-zinc-600">
                    {new Date(
                      item.created_at
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-sm text-zinc-600">
          Collector Intelligence Autonomous
          Enrichment Engine
        </div>
      </div>
    </div>
  );
}