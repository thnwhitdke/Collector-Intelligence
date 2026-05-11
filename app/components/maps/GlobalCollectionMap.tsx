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
      const [tooltip, setTooltip] =
    useState<TooltipData>(null);

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
                        transition: "all 250ms ease",
                        filter:
                          value > 0
                            ? "drop-shadow(0 0 8px rgba(6,182,212,0.45))"
                            : "none",
                      },

                      hover: {
                        outline: "none",
                        fill: "#22d3ee",
                        cursor: "pointer",
                        filter:
                          "drop-shadow(0 0 18px rgba(34,211,238,0.9))",
                      },

                      pressed: {
                        outline: "none",
                      },

                    }}
                  />

                );
              })

            }

          </Geographies>

        </ZoomableGroup>

      </ComposableMap>

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

    </div>

  </div>

);
}