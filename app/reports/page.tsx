export const dynamic = "force-dynamic";
import Link from "next/link";

import { getReportData } from "@/src/lib/reports-data";

import {
  enrichDiscogsMetadata,
} from "../actions/discogs-enrichment";

import EnrichButton from "./components/EnrichButton";
import KpiCards from "./components/KpiCards";
import GlobalMap from "./components/GlobalMap";

import {
  normalizeGenres,
  normalizeFormats,
  countryValueTotals,
} from "@/src/lib/report-normalizers";

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
};

export default async function ReportsPage() {

  /*
    LOAD DATABASE DATA
  */

  const rawRecords =
    await getReportData();

  /*
    NORMALIZE RECORDS
  */

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

      })
    );

  /*
    FILTER OPTIONS
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
        records.flatMap((r) =>
          String(r.genre)
            .split(",")
            .map((g) => g.trim())
        )
      )
    ).sort(),
  ];

  const allFormats = [
    "All Formats",

    ...Array.from(
      new Set(
        records.flatMap((r) =>
          String(r.format)
            .split(",")
            .map((f) => f.trim())
        )
      )
    ).sort(),
  ];

  /*
    KPI DATA
  */

  const totalValue =
    records.reduce(
      (sum, r) =>
        sum + r.estimated,
      0
    );

  const totalPurchase =
    records.reduce(
      (sum, r) =>
        sum + r.purchase,
      0
    );

  const avgROI =
    Math.round(

      records.reduce(
        (sum, r) => {

          if (r.purchase <= 0) {
            return sum;
          }

          return (
            sum +
            (
              (
                r.estimated -
                r.purchase
              ) /
              r.purchase
            ) * 100
          );

        },
        0
      ) /

      (records.length || 1)

    );

  /*
    ANALYTICS
  */

  const genreData =
    normalizeGenres(records);

  const formatMap =
    normalizeFormats(records);

  const countryTotals =
    countryValueTotals(records);

  /*
    METADATA COMPLETION
  */

  const enrichedRecords =
    records.filter(
      (record) =>
        record.genre &&
        record.genre !== "Unknown"
    ).length;

  const remainingRecords =
    records.length -
    enrichedRecords;

  const metadataCoverage =
    Math.round(
      (
        enrichedRecords /
        (records.length || 1)
      ) * 100
    );

  /*
    COUNTRY COUNTS
  */

  const countryCounts: Record<
    string,
    number
  > = {};

  records.forEach((record) => {

    const country =
      record.country ||
      "Unknown";

    countryCounts[country] =
      (
        countryCounts[country] ||
        0
      ) + 1;

  });

  /*
    TOP RECORDS
  */

  const topRecords =
    [...records]
      .sort(
        (a, b) =>
          b.estimated -
          a.estimated
      )
      .slice(0, 12);

  /*
    DECADE BREAKDOWN
  */

  const decadeMap: Record<
    string,
    number
  > = {};

  records.forEach((record) => {

    const decade =
      Math.floor(
        record.year / 10
      ) * 10;

    if (!decade) {
      return;
    }

    const label =
      `${decade}s`;

    decadeMap[label] =
      (
        decadeMap[label] ||
        0
      ) + 1;

  });

  return (

    <div className="min-h-screen bg-[#0A0907] text-[#F4EFE6]">

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">

        {/* HERO */}

        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-10">

          <div>

            <div
              className="
                inline-flex
                items-center
                gap-2
                px-4
                py-2
                rounded-full
                border
                border-[#8F6F35]/40
                bg-[#1A1510]
                text-[#C7A45D]
                text-xs
                tracking-[0.25em]
                uppercase
                mb-6
              "
            >
              Collector Intelligence
            </div>

            <h1 className="text-7xl font-black tracking-tight leading-none">
              Reports &
              <br />
              Analytics
            </h1>

            <div
              className="
                text-[#9A8F80]
                mt-6
                text-xl
                max-w-3xl
                leading-relaxed
              "
            >
              Enterprise-grade collection intelligence,
              rarity tracking,
              metadata analytics,
              valuation intelligence,
              and global market diagnostics.
            </div>

          </div>

          {/* FILTER PANEL */}

          <div
            className="
              flex
              flex-col
              gap-4
              min-w-[360px]
              rounded-3xl
              border
              border-[#2A241D]
              bg-[#11100E]
              p-6
            "
          >

            <input
              placeholder="Search metadata..."
              className="
                bg-[#17130F]
                border
                border-[#3A3328]
                rounded-2xl
                px-5
                py-4
                text-lg
                outline-none
                focus:border-[#C7A45D]
              "
            />

            <div className="grid grid-cols-2 gap-3">

              <select
                className="
                  bg-[#17130F]
                  border
                  border-[#3A3328]
                  rounded-2xl
                  px-4
                  py-3
                "
              >

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

              <select
                className="
                  bg-[#17130F]
                  border
                  border-[#3A3328]
                  rounded-2xl
                  px-4
                  py-3
                "
              >

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

            <select
              className="
                bg-[#17130F]
                border
                border-[#3A3328]
                rounded-2xl
                px-4
                py-3
              "
            >

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

              <EnrichButton
                action={
                  enrichDiscogsMetadata
                }
              />

              <Link
                href="/collection"
                className="
                  bg-[#17130F]
                  border
                  border-[#3A3328]
                  hover:border-[#C7A45D]/40
                  transition
                  rounded-2xl
                  py-3
                  text-center
                  font-semibold
                  flex
                  items-center
                  justify-center
                "
              >
                Collection
              </Link>

            </div>

          </div>

        </div>

        <KpiCards
          totalValue={
            totalValue
          }
          totalRecords={
            records.length
          }
          avgROI={
            avgROI
          }
          activeMarkets={
            Object.keys(
              countryTotals
            ).length
          }
        />

      </div>

    </div>

  );

}