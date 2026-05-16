"use client";

import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";

import { scaleLinear } from "d3-scale";

import { useState } from "react";

const geoUrl =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type CountryData = {
  country: string;
  value: number;
  count: number;
};

type Props = {
  data: CountryData[];
};
type TooltipData = {
  country: string;
  value: number;
  count: number;
} | null;

const colorScale = scaleLinear<string>()
  .domain([0, 1000, 5000])
  .range([
    "#172033",
    "#06b6d4",
    "#facc15",
  ]);

export default function GlobalCollectionMap({ data }: Props) {
  const [tooltip, setTooltip] = useState<TooltipData>(null);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);

  const normalized = data.reduce<Record<string, CountryData>>(
    (acc, item) => {

      const key =
        item.country
          .trim()
          .toLowerCase();

      acc[key] = item;

      return acc;

    },
    {}
  );
return (

  <div className="relative w-full">

    <div className="relative z-10 overflow-visible rounded-[2rem] border border-white/10 bg-[#020617]">

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.12),transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent)] pointer-events-none" />

<div className="absolute inset-0 opacity-30 pointer-events-none">

  <div className="absolute left-[10%] top-[20%] h-[220px] w-[220px] rounded-full bg-cyan-500/10 blur-3xl animate-pulse" />

  <div className="absolute right-[12%] top-[28%] h-[260px] w-[260px] rounded-full bg-yellow-500/10 blur-3xl animate-pulse" />

  <div className="absolute bottom-[8%] left-[38%] h-[200px] w-[200px] rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />

</div>

<div className="absolute inset-0 opacity-30 pointer-events-none">

  <div className="absolute left-[10%] top-[20%] h-[220px] w-[220px] rounded-full bg-cyan-500/10 blur-3xl animate-pulse" />

  <div className="absolute right-[12%] top-[28%] h-[260px] w-[260px] rounded-full bg-yellow-500/10 blur-3xl animate-pulse" />

  <div className="absolute bottom-[8%] left-[38%] h-[200px] w-[200px] rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />

</div>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 165,
        }}
        width={1400}
        height={700}
        style={{
          width: "100%",
          height: "auto",
          position: "relative",
          zIndex: 1,
        }}
      >

        <ZoomableGroup center={[10, 20]} zoom={1}>

          <Geographies geography={geoUrl}>

            {({ geographies }) =>

              geographies.map((geo) => {

                const rawGeoName =
                  geo.properties.name
                    ?.trim()
                    .toLowerCase();

                const geoNameMap: Record<string, string> = {

                  "united states":
                    "united states of america",

                  "russian federation":
                    "russia",

                  "korea, republic of":
                    "south korea",

                  "korea":
                    "south korea",

                  "england":
                    "united kingdom",

                };

                const countryName =
                  geoNameMap[rawGeoName] ||
                  rawGeoName;

                const countryData =
                  normalized[countryName];

const value =
  countryData?.value || 0;

const intensity =
  Math.min(
    value / 5000,
    1
  );

const pulseSpeed =
  value > 10000
    ? "2.5s"
    : value > 5000
    ? "4s"
    : "7s";

const glowStrength =
  value > 10000
    ? "0 0 30px rgba(250,204,21,0.9)"
    : value > 5000
    ? "0 0 22px rgba(34,211,238,0.75)"
    : "0 0 12px rgba(6,182,212,0.45)";

                return (

                  <Geography
                    key={geo.rsmKey}
                    geography={geo}

                    onMouseEnter={() => {

                      if (!countryData) {
                        return;
                      }

                      setTooltip({
                        country: countryData.country,
                        value: countryData.value,
                        count: countryData.count,
                      });

                      setSelectedCountry({
  name,
  value,
  countryData,
});

                    }}

                    onMouseLeave={() => {
                      setTooltip(null);
                    }}

                    fill={
                      value > 0
                        ? colorScale(value)
                        : "#0f172a"
                    }

                    stroke="#334155"
                    strokeWidth={0.55}

                    style={{

                      default: {
  outline: "none",

  transition: "all 350ms ease",

  filter:
    value > 0
      ? `drop-shadow(${glowStrength})`
      : "none",

  animation:
    value > 0
      ? `pulse ${pulseSpeed} ease-in-out infinite`
      : "none",

  opacity:
    value > 0
      ? 0.75 + (intensity * 0.25)
      : 0.45,
},

hover: {
  outline: "none",

  fill: "#67e8f9",

  cursor: "pointer",

  filter:
    "drop-shadow(0 0 28px rgba(34,211,238,1))",

  opacity: 1,

  transition: "all 150ms ease",
},

                    }}
                  />

                );
              })

            }

          </Geographies>

        </ZoomableGroup>

      </ComposableMap>

      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent)] pointer-events-none" />

<div className="absolute inset-0 opacity-30 pointer-events-none">

  <div className="absolute left-[10%] top-[20%] h-[220px] w-[220px] rounded-full bg-cyan-500/10 blur-3xl animate-pulse" />

  <div className="absolute right-[12%] top-[28%] h-[260px] w-[260px] rounded-full bg-yellow-500/10 blur-3xl animate-pulse" />

  <div className="absolute bottom-[8%] left-[38%] h-[200px] w-[200px] rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />

</div>

      {tooltip && (

        <div
          className="
            absolute
            left-6
            top-6
            z-[999]
            w-[320px]
            rounded-3xl
            border
            border-cyan-400/20
            bg-black/80
            backdrop-blur-xl
            p-6
            shadow-[0_0_40px_rgba(6,182,212,0.25)]
          "
        >

          <div className="text-xs uppercase tracking-[0.25em] text-cyan-300">
            Collector Intelligence
          </div>

          <h3 className="mt-3 text-3xl font-black text-white">
            {tooltip.country}
          </h3>

          <div className="mt-6 grid gap-4">

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">

              <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                Collection Value
              </div>

              <div className="mt-2 text-2xl font-black text-cyan-300">
                $
                {Math.round(tooltip.value).toLocaleString()}
              </div>

            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">

              <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                Records
              </div>

              <div className="mt-2 text-2xl font-black text-white">
                {tooltip.count}
              </div>

            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">

              <div className="text-xs uppercase tracking-[0.15em] text-slate-500">
                Market Heat
              </div>

              <div className="mt-2 text-2xl font-black text-yellow-300">
                ACTIVE
              </div>

            </div>

          </div>

        </div>

      )}

      {selectedCountry && (

  <div className="absolute top-6 right-6 z-[999] w-[360px]">

    <div className="
      rounded-3xl
      border
      border-cyan-400/20
      bg-black/80
      backdrop-blur-2xl
      p-6
      shadow-[0_0_60px_rgba(6,182,212,0.25)]
    ">

      <div className="flex items-start justify-between">

        <div>

          <div className="
            text-xs
            uppercase
            tracking-[0.3em]
            text-cyan-300
          ">
            Regional Intelligence
          </div>

          <div className="
            mt-2
            text-3xl
            font-black
            text-white
          ">
            {selectedCountry.name}
          </div>

        </div>

        <button
          onClick={() => setSelectedCountry(null)}
          className="
            rounded-full
            border
            border-white/10
            px-3
            py-1
            text-xs
            text-slate-400
            hover:bg-white/10
          "
        >
          CLOSE
        </button>

      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">

        <div className="
          rounded-2xl
          border
          border-cyan-400/10
          bg-cyan-400/5
          p-4
        ">

          <div className="
            text-xs
            uppercase
            tracking-[0.15em]
            text-cyan-300
          ">
            Market Value
          </div>

          <div className="
            mt-2
            text-2xl
            font-black
            text-white
          ">
            $
            {Math.round(
              selectedCountry.value || 0
            ).toLocaleString()}
          </div>

        </div>

        <div className="
          rounded-2xl
          border
          border-yellow-400/10
          bg-yellow-400/5
          p-4
        ">

          <div className="
            text-xs
            uppercase
            tracking-[0.15em]
            text-yellow-300
          ">
            Market Heat
          </div>

          <div className="
            mt-2
            text-2xl
            font-black
            text-yellow-200
          ">
            ACTIVE
          </div>

        </div>

      </div>

      <div className="
        mt-6
        rounded-2xl
        border
        border-white/10
        bg-white/[0.03]
        p-5
      ">

        <div className="
          text-xs
          uppercase
          tracking-[0.2em]
          text-slate-400
        ">
          Intelligence Summary
        </div>

        <div className="
          mt-4
          space-y-3
          text-sm
          text-slate-300
        ">

          <div className="flex justify-between">
            <span>Collector Density</span>
            <span className="text-cyan-300">
              Elevated
            </span>
          </div>

          <div className="flex justify-between">
            <span>Volatility</span>
            <span className="text-yellow-300">
              Moderate
            </span>
          </div>

          <div className="flex justify-between">
            <span>Demand Trend</span>
            <span className="text-emerald-300">
              Rising
            </span>
          </div>

          <div className="flex justify-between">
            <span>Market Signal</span>
            <span className="text-pink-300">
              Active Zone
            </span>
          </div>

        </div>

      </div>

      <div className="
        mt-6
        rounded-2xl
        border
        border-cyan-400/10
        bg-cyan-400/[0.03]
        p-5
      ">

        <div className="
          text-xs
          uppercase
          tracking-[0.2em]
          text-cyan-300
        ">
          Collector Intelligence Feed
        </div>

        <div className="
          mt-4
          space-y-4
          text-sm
        ">

          <div className="
            rounded-xl
            border
            border-white/5
            bg-black/30
            p-3
          ">
            <div className="text-white font-semibold">
              Rare market activity detected
            </div>

            <div className="mt-1 text-slate-400">
              Collector concentration increasing in this region.
            </div>
          </div>

          <div className="
            rounded-xl
            border
            border-white/5
            bg-black/30
            p-3
          ">
            <div className="text-white font-semibold">
              Discogs demand trending upward
            </div>

            <div className="mt-1 text-slate-400">
              Marketplace supply tightening across monitored releases.
            </div>
          </div>

        </div>

      </div>

    </div>

  </div>

)}

    </div>

  </div>

);
}