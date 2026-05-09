import Link from "next/link";

import { getReportData } from "@/src/lib/reports-data";

import KpiCards from "./components/KpiCards";
import GlobalMap from "./components/GlobalMap";
import AnalyticsCharts from "./components/AnalyticsCharts";

type RecordItem = {
  artist: string;
  title: string;
  label: string;
  country: string;
  genre: string;
  format: string;
  condition: string;
  year: number;
  purchase: number;
  estimated: number;
  velocity: number;
};

export default async function ReportsPage() {

  const rawRecords =
    await getReportData();

  const records: RecordItem[] =
    rawRecords.map(
      (record: any) => ({
        artist:
          record.artist || "",

        title:
          record.title || "",

        label:
          record.label || "",

        country:
          record.country || "Unknown",

        genre:
          record.genre || "Unknown",

        format:
          record.format || "Unknown",

        condition:
          record.media_condition ||
          "Unknown",

        year:
          Number(
            record.year_released
          ) || 0,

        purchase:
          Number(
            record.purchase_price
          ) || 0,

        estimated:
          Number(
            record.estimated_value ||
            record.discogs_median_price ||
            0
          ),

        velocity:
          Math.floor(
            Math.random() * 40
          ) + 60,
      })
    );

  /*
    DYNAMIC OPTIONS
  */

  const allCountries = [
    "All Countries",
    ...Array.from(
      new Set(
        records
          .map((r) => r.country)
          .filter(Boolean)
      )
    ).sort(),
  ];

  const allGenres = [
    "All Genres",
    ...Array.from(
      new Set(
        records
          .map((r) => r.genre)
          .filter(Boolean)
      )
    ).sort(),
  ];

  const allFormats = [
    "All Formats",
    ...Array.from(
      new Set(
        records
          .map((r) => r.format)
          .filter(Boolean)
      )
    ).sort(),
  ];

  /*
    KPI AGGREGATION
  */

  const totalValue =
    records.reduce(
      (sum, r) =>
        sum + r.estimated,
      0
    );

  const avgROI = Math.round(
    records.reduce(
      (sum, r) => {
        if (
          !r.purchase ||
          r.purchase <= 0
        ) {
          return sum;
        }

        return (
          sum +
          ((r.estimated -
            r.purchase) /
            r.purchase) *
            100
        );
      },
      0
    ) /
      (records.length || 1)
  );

  /*
    GENRE BREAKDOWN
  */

  const genreMap: Record<
    string,
    number
  > = {};

  records.forEach((r) => {
    genreMap[r.genre] =
      (genreMap[r.genre] || 0) + 1;
  });

  const genreData =
    Object.entries(
      genreMap
    ).map(([name, value]) => ({
      name,
      value,
    }));

  /*
    FORMAT BREAKDOWN
  */

  const formatMap: Record<
    string,
    number
  > = {};

  records.forEach((r) => {
    formatMap[r.format] =
      (formatMap[r.format] || 0) + 1;
  });

  /*
    MARKET VELOCITY
  */

  const velocityData =
    records.map((r) => ({
      name:
        r.artist ||
        "Unknown",
      velocity: r.velocity,
    }));

  /*
    COUNTRY VALUE TOTALS
  */

  const countryTotals: Record<
    string,
    number
  > = {};

  records.forEach((r) => {
    countryTotals[r.country] =
      (countryTotals[r.country] ||
        0) + r.estimated;
  });

  return (
    <div className="min-h-screen bg-[#0A0907] text-[#F4EFE6]">

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">

        {/* HERO */}

        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-10">

          <div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#8F6F35]/40 bg-[#1A1510] text-[#C7A45D] text-xs tracking-[0.25em] uppercase mb-6">
              Collector Intelligence
            </div>

            <h1 className="text-7xl font-black tracking-tight leading-none">
              Reports &
              <br />
              Analytics
            </h1>

            <div className="text-[#9A8F80] mt-6 text-xl max-w-3xl leading-relaxed">
              Enterprise-grade collection intelligence,
              rarity tracking,
              metadata analytics,
              valuation intelligence,
              and market diagnostics.
            </div>

          </div>

          {/* FILTER BOX */}

          <div className="flex flex-col gap-4 min-w-[360px] rounded-3xl border border-[#2A241D] bg-[#11100E] p-6">

            <input
              placeholder="Search metadata..."
              className="bg-[#17130F] border border-[#3A3328] rounded-2xl px-5 py-4 text-lg outline-none focus:border-[#C7A45D]"
            />

            <div className="grid grid-cols-2 gap-3">

              <select className="bg-[#17130F] border border-[#3A3328] rounded-2xl px-4 py-3">

                {allCountries.map(
                  (country) => (
                    <option
                      key={country}
                    >
                      {country}
                    </option>
                  )
                )}

              </select>

              <select className="bg-[#17130F] border border-[#3A3328] rounded-2xl px-4 py-3">

                {allGenres.map(
                  (genre) => (
                    <option
                      key={genre}
                    >
                      {genre}
                    </option>
                  )
                )}

              </select>

            </div>

            <select className="bg-[#17130F] border border-[#3A3328] rounded-2xl px-4 py-3">

              {allFormats.map(
                (format) => (
                  <option
                    key={format}
                  >
                    {format}
                  </option>
                )
              )}

            </select>

            <div className="grid grid-cols-2 gap-3">

              <button className="bg-[#C7A45D] hover:bg-[#D6B56D] transition rounded-2xl py-3 font-bold text-[#11100E]">
                Generate Report
              </button>

              <Link
                href="/collection"
                className="bg-[#17130F] border border-[#3A3328] hover:border-[#C7A45D]/40 transition rounded-2xl py-3 text-center font-semibold"
              >
                Collection
              </Link>

            </div>

          </div>

        </div>

        {/* KPI */}

        <KpiCards
          totalValue={
            totalValue
          }
          totalRecords={
            records.length
          }
          avgROI={avgROI}
          activeMarkets={
            Object.keys(
              countryTotals
            ).length
          }
        />

        {/* CHARTS */}

        <AnalyticsCharts
          genreData={genreData}
          velocityData={
            velocityData
          }
        />

        {/* MAP */}

        <GlobalMap
          countryTotals={
            countryTotals
          }
        />

        {/* FORMAT BREAKDOWN */}

        <div className="rounded-3xl border border-[#2A241D] bg-[#11100E] p-8">

          <div className="text-4xl font-black mb-8">
            Format Breakdown
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">

            {Object.entries(
              formatMap
            ).map(
              ([format, count]) => (
                <div
                  key={format}
                  className="rounded-2xl border border-[#2A241D] bg-[#17130F] p-5"
                >

                  <div className="text-sm uppercase tracking-[0.2em] text-[#8E8170]">
                    {format}
                  </div>

                  <div className="text-4xl font-black mt-3 text-[#C7A45D]">
                    {count}
                  </div>

                </div>
              )
            )}

          </div>

        </div>

      </div>

    </div>
  );
}