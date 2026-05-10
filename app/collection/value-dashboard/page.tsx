"use client";

import { useState } from "react";
import useSWR from "swr";
import { WorldMap } from "react-svg-worldmap";
import { createClient } from "@supabase/supabase-js";
import MarketTicker from "../../components/MarketTicker";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const fetcher = (url: string) =>
  fetch(url).then((res) => res.json());

const COLORS = [
  "#facc15",
  "#eab308",
  "#ca8a04",
  "#854d0e",
  "#451a03",
];

function convertCountryToISO(country: string) {
  const mapping: Record<string, string> = {
    USA: "us",
    "United States": "us",
    UK: "gb",
    "United Kingdom": "gb",
    Germany: "de",
    France: "fr",
    Japan: "jp",
    Canada: "ca",
    Italy: "it",
    Australia: "au",
    Netherlands: "nl",
    Sweden: "se",
  };

  return mapping[country] || "us";
}

export default function ValueDashboardPage() {

  const [isEnriching, setIsEnriching] =
    useState(false);

  const [enrichMessage, setEnrichMessage] =
    useState("");
    const [topMovers, setTopMovers] =
  useState<any[]>([]);

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR(
    "/api/dashboard/analytics",
    async (url) => {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          "Failed to fetch analytics"
        );
      }

      return response.json();
    }
  );
useSWR(
  "top-movers",
  async () => {

    const { data } =
      await supabase
        .from("market_changes")
        .select("*")
        .not(
          "change_percent",
          "is",
          null
        )
        .order(
          "change_percent",
          {
            ascending: false,
          }
        )
        .limit(5);

    setTopMovers(data || []);

    return data;
  }
);


  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading Collector Intelligence...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-red-500 flex items-center justify-center">
        Failed to load analytics
      </div>
    );
  }

  const mapData = data.countryDistribution.map(
    (c: any) => ({
      country: convertCountryToISO(
        c.country
      ) as any,

      value: Number(c.count),
    })
  );

  async function handleEnrichment() {

    try {

      setIsEnriching(true);

      setEnrichMessage(
        "Starting Discogs enrichment..."
      );

      const response = await fetch(
        "/api/discogs/enrich"
      );

      const result =
        await response.json();

      console.log(
        "ENRICH RESULT:",
        result
      );

      if (response.ok) {

        setEnrichMessage(
          result.message ||
          `Enrichment complete. Updated ${
            result.enriched || 0
          } records.`
        );

        await mutate();

      } else {

        setEnrichMessage(
          result.error ||
          result.message ||
          "Enrichment failed"
        );
      }

    } catch (error: any) {

      console.error(error);

      setEnrichMessage(
        error?.message ||
        "Enrichment crashed"
      );

    } finally {

      setIsEnriching(false);

    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">

      <div className="max-w-[1800px] mx-auto space-y-8">

        {/* LIVE MARKET TICKER */}

        <MarketTicker />

        {/* HEADER */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <div>

            <div className="inline-flex items-center px-4 py-2 rounded-full border border-yellow-900/20 bg-zinc-950 text-yellow-400 text-xs tracking-[0.3em] uppercase">
              Collector Intelligence
            </div>

            <h1 className="text-6xl font-black mt-6 leading-none">
              Reports & Analytics
            </h1>

            <p className="text-zinc-500 text-xl mt-6 max-w-3xl">
              Enterprise-grade collection intelligence,
              rarity tracking, valuation analytics,
              metadata enrichment, and global market diagnostics.
            </p>

          </div>

          {/* CONTROL PANEL */}

          <div className="bg-zinc-950 border border-yellow-900/20 rounded-3xl p-6">

            <div className="space-y-4">

              <input
                type="text"
                placeholder="Search metadata..."
                className="w-full bg-black border border-yellow-900/20 rounded-2xl px-4 py-4 text-white"
              />

              <div className="grid grid-cols-2 gap-4">

                <select className="bg-black border border-yellow-900/20 rounded-xl px-4 py-3 text-white">
                  <option>All Countries</option>
                </select>

                <select className="bg-black border border-yellow-900/20 rounded-xl px-4 py-3 text-white">
                  <option>All Genres</option>
                </select>

              </div>

              <select className="w-full bg-black border border-yellow-900/20 rounded-xl px-4 py-3 text-white">
                <option>All Formats</option>
              </select>

              <div className="grid grid-cols-2 gap-4">

                <button
                  onClick={handleEnrichment}
                  disabled={isEnriching}
                  className={`rounded-2xl py-4 font-bold transition ${
                    isEnriching
                      ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                      : "bg-yellow-400 hover:bg-yellow-300 text-black"
                  }`}
                >
                  {isEnriching
                    ? "Enriching..."
                    : "Enrich Discogs Metadata"}
                </button>

                <button className="bg-black border border-yellow-900/20 hover:border-yellow-700 transition rounded-2xl py-4 font-bold">
                  Collection
                </button>

              </div>

              <div className="bg-black border border-yellow-900/20 rounded-2xl p-4">

                <p className="text-sm text-zinc-400 uppercase tracking-widest">
                  Enrichment Status
                </p>

                <p className="mt-2 text-yellow-400 font-semibold">
                  {enrichMessage || "Idle"}
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* KPI CARDS */}

        <div className="grid grid-cols-4 gap-6">

          <MetricCard
            title="Collection Value"
            value={`$${data.totalCollectionValue.toLocaleString()}`}
          />

          <MetricCard
            title="Records"
            value={data.totalRecords.toString()}
          />

          <MetricCard
            title="Median Value"
            value={`$${data.medianValue}`}
          />

          <MetricCard
            title="Countries"
            value={data.totalCountries.toString()}
          />

        </div>

        {/* MAP + TOP RECORDS */}

        <div className="grid grid-cols-3 gap-6">

          <div className="col-span-2 bg-zinc-950 border border-yellow-900/20 rounded-3xl p-6">

            <div className="flex justify-between mb-6">

              <h2 className="text-3xl font-bold">
                Global Collection Density
              </h2>

              <div className="flex gap-4">

                <Legend
                  color="#422006"
                  label="Low"
                />

                <Legend
                  color="#a16207"
                  label="Moderate"
                />

                <Legend
                  color="#eab308"
                  label="High"
                />

              </div>

            </div>

            <div className="bg-black rounded-2xl p-4">

              <WorldMap
                color="#facc15"
                title=""
                size="responsive"
                data={mapData}
                tooltipTextFunction={(
                  context: any
                ) =>
                  `${context.countryName}: ${context.value || 0} records`
                }
              />

            </div>

          </div>

          <AnalyticsCard title="Top Records">

            <div className="space-y-4">

              {data.topRecords.map(
                (record: any) => (

                  <div
                    key={record.id}
                    className="bg-black border border-yellow-900/20 rounded-2xl p-4 flex justify-between"
                  >

                    <div>

                      <p className="font-bold">
                        {record.artist}
                      </p>

                      <p className="text-zinc-500 text-sm">
                        {record.title}
                      </p>

                    </div>

                    <div className="text-yellow-400 font-black text-2xl">
                      $
                      {record.estimated_value}
                    </div>

                  </div>
                )
              )}

            </div>

          </AnalyticsCard>
          <AnalyticsCard title="Top Movers">

  <div className="space-y-4">

    {topMovers.map(
      (mover: any) => (

        <div
          key={mover.id}
          className="bg-black border border-yellow-900/20 rounded-2xl p-4 flex justify-between"
        >

          <div>

            <p className="font-bold">
              {mover.artist}
            </p>

            <p className="text-zinc-500 text-sm">
              {mover.title}
            </p>

          </div>

          <div
            className={`font-black text-2xl ${
              mover.change_percent >= 0
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >

            {mover.change_percent >= 0
              ? "▲"
              : "▼"}

            {" "}

            {mover.change_percent.toFixed(1)}%

          </div>

        </div>
      )
    )}

  </div>

</AnalyticsCard>

        </div>

        {/* CHARTS */}

        <div className="grid grid-cols-2 gap-6">

          <AnalyticsCard title="Market Momentum">

            <ResponsiveContainer
              width="100%"
              height={300}
            >

              <AreaChart
                data={data.marketMomentum}
              >

                <CartesianGrid stroke="#27272a" />

                <XAxis
                  dataKey="month"
                  stroke="#71717a"
                />

                <YAxis stroke="#71717a" />

                <Tooltip />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#facc15"
                  fill="#facc15"
                />

              </AreaChart>

            </ResponsiveContainer>

          </AnalyticsCard>

          <AnalyticsCard title="Genre Distribution">

            <ResponsiveContainer
              width="100%"
              height={300}
            >

              <PieChart>

                <Pie
                  data={data.genreDistribution}
                  dataKey="count"
                  nameKey="genre"
                  outerRadius={100}
                >

                  {data.genreDistribution.map(
                    (
                      entry: any,
                      index: number
                    ) => (
                      <Cell
                        key={index}
                        fill={
                          COLORS[
                            index %
                              COLORS.length
                          ]
                        }
                      />
                    )
                  )}

                </Pie>

                <Tooltip />

              </PieChart>

            </ResponsiveContainer>

          </AnalyticsCard>

        </div>

      </div>

    </div>
  );
}

function MetricCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-zinc-950 border border-yellow-900/20 rounded-3xl p-6">

      <p className="text-zinc-500 uppercase text-xs tracking-widest">
        {title}
      </p>

      <h2 className="text-4xl font-black text-yellow-400 mt-4">
        {value}
      </h2>

    </div>
  );
}

function AnalyticsCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-950 border border-yellow-900/20 rounded-3xl p-6">

      <h2 className="text-3xl font-bold mb-6">
        {title}
      </h2>

      {children}

    </div>
  );
}

function Legend({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">

      <div
        className="w-5 h-5 rounded"
        style={{
          backgroundColor: color,
        }}
      />

      <span>{label}</span>

    </div>
  );
}