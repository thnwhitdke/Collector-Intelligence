"use client";

import { useState } from "react";
import useSWR from "swr";
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
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const COLORS = [
  "#facc15",
  "#eab308",
  "#ca8a04",
  "#854d0e",
  "#451a03",
];

interface AnalyticsData {
  countryDistribution: any[];
  topRecords: any[];
  marketMomentum: any[];
  genreDistribution: any[];
  totalCollectionValue: number;
  totalRecords: number;
  medianValue: number;
  totalCountries: number;
  averageCollectorIQ: number;
}

const EMPTY_ANALYTICS: AnalyticsData = {
  countryDistribution: [],
  topRecords: [],
  marketMomentum: [],
  genreDistribution: [],
  totalCollectionValue: 0,
  totalRecords: 0,
  medianValue: 0,
  totalCountries: 0,
  averageCollectorIQ: 0,
};

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

  return mapping[country] || country;
}

export default function ValueDashboardPage() {
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichMessage, setEnrichMessage] = useState("Idle");
  const [topMovers, setTopMovers] = useState<any[]>([]);

  const fetcher = async (url: string) => {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch analytics");
    }

    return response.json();
  };

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR(
    "/api/dashboard/analytics",
    fetcher
  );

  useSWR("top-movers", async () => {
    try {
      const response = await supabase
        .from("market_changes")
        .select("*")
        .not("change_percent", "is", null)
        .order("change_percent", {
          ascending: false,
        })
        .limit(5);

      if (Array.isArray(response.data)) {
        setTopMovers(response.data);
      } else {
        setTopMovers([]);
      }

      return response.data;
    } catch (err) {
      console.error(err);
      setTopMovers([]);
      return [];
    }
  });

  const analytics: AnalyticsData = {
    countryDistribution: Array.isArray(data?.countryDistribution)
      ? data.countryDistribution
      : EMPTY_ANALYTICS.countryDistribution,

    topRecords: Array.isArray(data?.topRecords)
      ? data.topRecords
      : EMPTY_ANALYTICS.topRecords,

    marketMomentum: Array.isArray(data?.marketMomentum)
      ? data.marketMomentum
      : EMPTY_ANALYTICS.marketMomentum,

    genreDistribution: Array.isArray(data?.genreDistribution)
      ? data.genreDistribution
      : EMPTY_ANALYTICS.genreDistribution,

    totalCollectionValue:
      Number(data?.totalCollectionValue) || 0,

    totalRecords:
      Number(data?.totalRecords) || 0,

    medianValue:
      Number(data?.medianValue) || 0,

    totalCountries:
      Number(data?.totalCountries) || 0,

    averageCollectorIQ:
      Number(data?.averageCollectorIQ) || 0,
  };

  const mapData = Array.isArray(
    analytics.countryDistribution
  )
    ? analytics.countryDistribution
        .filter(
          (c: any) =>
            c &&
            typeof c === "object" &&
            c.country
        )
        .map((c: any) => ({
          country: convertCountryToISO(
            String(c.country)
          ),

          value: Number(c.count || 0),
        }))
    : [];

  async function handleEnrichment() {
    try {
      setIsEnriching(true);

      setEnrichMessage(
        "Starting enrichment..."
      );

      const response = await fetch(
        "/api/discogs/enrich"
      );

      const result = await response.json();

      if (response.ok) {
        setEnrichMessage(
          result?.message ||
            "Enrichment complete"
        );

        await mutate();
      } else {
        setEnrichMessage(
          result?.error ||
            "Enrichment failed"
        );
      }
    } catch (err) {
      console.error(err);

      setEnrichMessage(
        "Enrichment crashed"
      );
    } finally {
      setIsEnriching(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-2xl font-bold">
        Loading Collector Intelligence...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-red-500 flex items-center justify-center text-2xl font-bold">
        Failed to load analytics
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">

      <div className="max-w-[1800px] mx-auto space-y-8">

       {/* <MarketTicker /> */}

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

          <div className="bg-zinc-950 border border-yellow-900/20 rounded-3xl p-6">

            <div className="space-y-4">

              <input
                type="text"
                placeholder="Search metadata..."
                className="w-full bg-black border border-yellow-900/20 rounded-2xl px-4 py-4 text-white"
              />

              <div className="grid grid-cols-2 gap-4">

                <select className="bg-black border border-yellow-900/20 rounded-xl px-4 py-3 text-white">
                  <option>
                    All Countries
                  </option>
                </select>

                <select className="bg-black border border-yellow-900/20 rounded-xl px-4 py-3 text-white">
                  <option>
                    All Genres
                  </option>
                </select>

              </div>

              <select className="w-full bg-black border border-yellow-900/20 rounded-xl px-4 py-3 text-white">
                <option>
                  All Formats
                </option>
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
                  {enrichMessage}
                </p>

              </div>

            </div>

          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

          <MetricCard
            title="Collection Value"
            value={`$${analytics.totalCollectionValue.toLocaleString()}`}
          />

          <MetricCard
            title="Records"
            value={analytics.totalRecords.toString()}
          />

          <MetricCard
            title="Median Value"
            value={`$${analytics.medianValue.toLocaleString()}`}
          />

          <MetricCard
            title="Countries"
            value={analytics.totalCountries.toString()}
          />

          <MetricCard
            title="Collector IQ"
            value={Math.round(
              analytics.averageCollectorIQ
            ).toString()}
          />

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 bg-zinc-950 border border-yellow-900/20 rounded-3xl p-6">

            <h2 className="text-3xl font-bold mb-6">
              Global Collection Density
            </h2>

            <div className="bg-black rounded-2xl p-6 min-h-[420px]">

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

                {mapData.length > 0 ? (
                  mapData.map(
                    (
                      item: any,
                      index: number
                    ) => (

                      <div
                        key={`${item.country}-${index}`}
                        className="bg-zinc-900 border border-yellow-900/20 rounded-2xl p-4"
                      >

                        <p className="text-zinc-500 text-xs uppercase tracking-widest">
                          Country
                        </p>

                        <h3 className="text-yellow-400 text-2xl font-black mt-2 uppercase">
                          {item.country}
                        </h3>

                        <p className="text-white mt-4 text-lg font-bold">
                          {item.value} Records
                        </p>

                      </div>
                    )
                  )
                ) : (
                  <div className="text-zinc-500 col-span-full text-center p-10">
                    No country data available
                  </div>
                )}

              </div>

            </div>

          </div>

          <AnalyticsCard title="Top Records">

            <div className="space-y-4">

              {analytics.topRecords.map((record: any) => (

                <div
                  key={record.id || Math.random()}
                  className="bg-black border border-yellow-900/20 rounded-2xl p-4 flex justify-between"
                >

                  <div>

                    <p className="font-bold">
                      {record.artist || "Unknown Artist"}
                    </p>

                    <p className="text-zinc-500 text-sm">
                      {record.title || "Unknown Title"}
                    </p>

                  </div>

                  <div className="text-yellow-400 font-black text-2xl">
                    ${Number(
                      record.estimated_value || 0
                    ).toLocaleString()}
                  </div>

                </div>
              ))}

            </div>

          </AnalyticsCard>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <AnalyticsCard title="Market Momentum">

            <div className="w-full h-[350px] min-h-[350px]">

              <ResponsiveContainer width="100%" height="100%">

                <AreaChart
                  data={analytics.marketMomentum}
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

            </div>

          </AnalyticsCard>

          <AnalyticsCard title="Genre Distribution">

            <div className="w-full h-[350px] min-h-[350px]">

              <ResponsiveContainer width="100%" height="100%">

                <PieChart>

                  <Pie
                    data={analytics.genreDistribution}
                    dataKey="count"
                    nameKey="genre"
                    outerRadius={120}
                    label
                  >

                    {analytics.genreDistribution.map(
                      (
                        _entry: any,
                        index: number
                      ) => (
                        <Cell
                          key={index}
                          fill={
                            COLORS[
                              index % COLORS.length
                            ]
                          }
                        />
                      )
                    )}

                  </Pie>

                  <Tooltip />

                </PieChart>

              </ResponsiveContainer>

            </div>

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