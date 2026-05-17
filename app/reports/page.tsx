export const dynamic = "force-dynamic";
import Link from "next/link";

import GlobalCollectionMap from "@/app/components/maps/GlobalCollectionMap";
import { normalizeCountry } from "@/src/lib/country-normalizer";
import { getReportData } from "@/src/lib/reports-data";

import {
  enrichDiscogsMetadata,
} from "@/app/actions/enrichment";

import EnrichButton from "./components/EnrichButton";
import KpiCards from "./components/KpiCards";
import LiveMarketFeed from "@/app/components/LiveMarketFeed";


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
  GLOBAL MAP DATA
*/

const mapTotals: Record<
  string,
  {
    country: string;
    value: number;
    count: number;
  }
> = {};

for (const record of records) {

  const rawCountry =
    String(record.country || "").trim();

  if (!rawCountry) {
    continue;
  }

  const normalizedCountry =
    normalizeCountry(rawCountry);

  const value =
    Number(record.estimated || 0);

  if (!mapTotals[normalizedCountry]) {

    mapTotals[normalizedCountry] = {
      country: normalizedCountry,
      value: 0,
      count: 0,
    };
  }

  mapTotals[normalizedCountry].value += value;

  mapTotals[normalizedCountry].count += 1;
}

const mapData =
  Object.values(mapTotals);
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
                action={async () => {
  await enrichDiscogsMetadata();
}}
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

<div className="mt-10">
  <LiveMarketFeed />
</div>

<div className="grid grid-cols-1 md:grid-cols-4 gap-6">

  ...
  metric cards
  ...

</div>

<div className="mt-10">
  <div
  className="
    rounded-3xl
    border
    border-[#2A241D]
    bg-[#11100E]
    p-8
  "
>

  <div className="flex justify-between mb-6">

    <div>

      <h2 className="text-4xl font-black">
        Global Collection Density
      </h2>

      <p className="text-[#9A8F80] mt-3">
        Geographic distribution of collection value
      </p>

    </div>

    <div className="flex gap-4">

      <div className="flex items-center gap-2">

        <div className="w-4 h-4 rounded bg-[#422006]" />

        <span className="text-sm text-[#9A8F80]">
          Low
        </span>

      </div>

      <div className="flex items-center gap-2">

        <div className="w-4 h-4 rounded bg-[#a16207]" />

        <span className="text-sm text-[#9A8F80]">
          Moderate
        </span>

      </div>

      <div className="flex items-center gap-2">

        <div className="w-4 h-4 rounded bg-[#facc15]" />

        <span className="text-sm text-[#9A8F80]">
          High
        </span>

      </div>

    </div>

  </div>

  <div className="bg-[#0A0907] rounded-3xl p-6">

<GlobalCollectionMap
  data={mapData}
/>

  </div>

</div>
  <div className="mt-16 mb-6">

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
      mb-4
    "
  >
    Collection Intelligence
  </div>

  <h2 className="text-4xl font-black">
    Market Analytics &
    Platform Diagnostics
  </h2>

  <p className="text-[#9A8F80] mt-3 text-lg">
    Advanced intelligence signals derived from
    metadata enrichment, valuation analysis,
    and global market distribution.
  </p>

</div>

<div
  className="
    grid
    grid-cols-1
    md:grid-cols-3
    gap-8
    mt-14
    pt-10
    border-t
    border-[#2A241D]
  "
>

  <div
    className="
      rounded-3xl
      border
      border-[#2A241D]
      bg-[#11100E]
      p-6
    "
  >

    <h3 className="text-2xl font-bold mb-6">
      Market Distribution
    </h3>

    <div className="space-y-4">

      {Object.entries(countryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([country, value]) => (

          <div
            key={country}
            className="
              flex
              items-center
              justify-between
            "
          >

            <span>
              {country}
            </span>

            <span
              className="
                text-[#FFD166]
                font-bold
              "
            >
              $
              {Number(value).toLocaleString()}
            </span>

          </div>

        ))}

    </div>

  </div>

  <div
    className="
      rounded-3xl
      border
      border-[#2A241D]
      bg-[#11100E]
      p-6
    "
  >

    <h3 className="text-2xl font-bold mb-6">
      Collection Intelligence
    </h3>

    <div className="space-y-6">

      <div>

        <div
          className="
            text-[#9A8F80]
            text-sm
          "
        >
          Average Record Value
        </div>

        <div
          className="
            text-3xl
            font-bold
            text-[#00C2FF]
          "
        >
          $
          {(totalValue / records.length).toFixed(2)}
        </div>

      </div>

      <div>

        <div
          className="
            text-[#9A8F80]
            text-sm
          "
        >
          Highest Value Market
        </div>

        <div
          className="
            text-3xl
            font-bold
            text-[#FFD166]
          "
        >
          USA
        </div>

      </div>

      <div>

        <div
          className="
            text-[#9A8F80]
            text-sm
          "
        >
          Collection Coverage
        </div>

        <div
          className="
            text-3xl
            font-bold
            text-[#5B3DF5]
          "
        >
          98%
        </div>

      </div>

    </div>

  </div>

  <div
    className="
      rounded-3xl
      border
      border-[#2A241D]
      bg-[#11100E]
      p-6
    "
  >

    <h3 className="text-2xl font-bold mb-6">
      Platform Status
    </h3>

    <div className="space-y-4">

      <div
        className="
          flex
          items-center
          justify-between
        "
      >

        <span>
          Discogs Sync
        </span>

        <span className="text-[#00E676]">
          Operational
        </span>

      </div>

      <div
        className="
          flex
          items-center
          justify-between
        "
      >

        <span>
          Market Analytics
        </span>

        <span className="text-[#00E676]">
          Live
        </span>

      </div>

      <div
        className="
          flex
          items-center
          justify-between
        "
      >

        <span>
          Metadata Engine
        </span>

        <span className="text-[#FFD166]">
          Enhanced
        </span>

      </div>

      <div
        className="
          flex
          items-center
          justify-between
        "
      >

        <span>
          Collection Index
        </span>

        <span className="text-[#00C2FF]">
          Active
         </span>

      </div>

    </div>

  </div>

</div>

</div>

      </div>

    </div>

  );

}