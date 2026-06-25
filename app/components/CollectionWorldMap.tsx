"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { geoNaturalEarth1, geoPath } from "d3-geo"
import { feature } from "topojson-client"

type CountryDatum = {
  country: string
  count: number
  percentage: number
  topFormat?: string | null
  topLabel?: string | null
}

type TooltipState = {
  x: number
  y: number
  country: string
  count: number
  percentage: number
  topFormat?: string | null
  topLabel?: string | null
} | null

function normalizeCountry(value: string | null | undefined) {
  const raw = String(value || "").trim()
  const key = raw.toLowerCase()

  const aliases: Record<string, string> = {
    us: "United States of America",
    usa: "United States of America",
    "u.s.": "United States of America",
    "u.s.a.": "United States of America",
    "united states": "United States of America",
    "united states of america": "United States of America",
    uk: "United Kingdom",
    "u.k.": "United Kingdom",
    england: "United Kingdom",
    scotland: "United Kingdom",
    "great britain": "United Kingdom",
    russia: "Russia",
    "russian federation": "Russia",
    czechia: "Czech Republic",
    "czech republic": "Czech Republic",
    "south korea": "South Korea",
    korea: "South Korea",
    "republic of korea": "South Korea",
    "north korea": "North Korea",
    iran: "Iran",
    "iran, islamic republic of": "Iran",
    vietnam: "Vietnam",
    "viet nam": "Vietnam",
    bolivia: "Bolivia",
    venezuela: "Venezuela",
    tanzania: "Tanzania",
    syria: "Syria",
    moldova: "Moldova",
    laos: "Laos",
    "bosnia and herzegovina": "Bosnia and Herzegovina",
  }

  return aliases[key] || raw
}

function flagFor(country: string) {
  const c = normalizeCountry(country)
  const flags: Record<string, string> = {
    "United States of America": "🇺🇸",
    "United Kingdom": "🇬🇧",
    Germany: "🇩🇪",
    Japan: "🇯🇵",
    France: "🇫🇷",
    Canada: "🇨🇦",
    Netherlands: "🇳🇱",
    Australia: "🇦🇺",
    Italy: "🇮🇹",
    Spain: "🇪🇸",
    Mexico: "🇲🇽",
    Argentina: "🇦🇷",
    Brazil: "🇧🇷",
    Sweden: "🇸🇪",
    Norway: "🇳🇴",
    Denmark: "🇩🇰",
    Finland: "🇫🇮",
    Ireland: "🇮🇪",
    Belgium: "🇧🇪",
    Switzerland: "🇨🇭",
    Austria: "🇦🇹",
    Greece: "🇬🇷",
    Portugal: "🇵🇹",
    Poland: "🇵🇱",
    Russia: "🇷🇺",
    China: "🇨🇳",
    India: "🇮🇳",
    "South Korea": "🇰🇷",
  }

  return flags[c] || "🌐"
}

export default function CollectionWorldMap({ data }: { data: CountryDatum[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [geographies, setGeographies] = useState<any[]>([])
  const [tooltip, setTooltip] = useState<TooltipState>(null)

  const width = 980
  const height = 480

  const projection = useMemo(
    () =>
      geoNaturalEarth1()
        .scale(175)
        .translate([width / 2, height / 2 + 20]),
    []
  )

  const path = useMemo(() => geoPath(projection), [projection])

  const countryMap = useMemo(() => {
    const map = new Map<string, CountryDatum>()

    for (const row of data) {
      const normalized = normalizeCountry(row.country)
      const existing = map.get(normalized)

      if (existing) {
        existing.count += Number(row.count || 0)
        existing.percentage += Number(row.percentage || 0)
      } else {
        map.set(normalized, {
          ...row,
          country: normalized,
          count: Number(row.count || 0),
          percentage: Number(row.percentage || 0),
        })
      }
    }

    return map
  }, [data])

  const topCountries = useMemo(
    () => [...countryMap.values()].sort((a, b) => b.count - a.count).slice(0, 10),
    [countryMap]
  )

  const maxCount = Math.max(1, ...[...countryMap.values()].map((d) => d.count))
  const totalCount = [...countryMap.values()].reduce((sum, d) => sum + d.count, 0)

  useEffect(() => {
    let mounted = true

    async function loadMap() {
      const response = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      const world = await response.json()
      const countries = feature(world, world.objects.countries) as any

      if (mounted) {
        setGeographies(countries.features || [])
      }
    }

    loadMap().catch(() => setGeographies([]))

    return () => {
      mounted = false
    }
  }, [])

  function fillFor(countryName: string) {
    const row = countryMap.get(normalizeCountry(countryName))
    if (!row) return "rgba(55, 65, 81, 0.55)"

    const intensity = row.count / maxCount

    if (intensity > 0.7) return "rgba(217, 249, 48, 0.92)"
    if (intensity > 0.4) return "rgba(132, 204, 22, 0.85)"
    if (intensity > 0.2) return "rgba(45, 212, 191, 0.78)"
    return "rgba(6, 182, 212, 0.58)"
  }

  return (
    <section className="rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-[#071315] via-[#081010] to-[#050505] p-6 shadow-2xl shadow-cyan-950/20">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-xl">
              🌎
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Collection Geography</h2>
              <p className="mt-1 text-sm text-[#B8AA96]">
                Where your records come from around the world.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-center">
            <div className="text-2xl font-black text-cyan-200">{countryMap.size}</div>
            <div className="text-xs text-cyan-300">Countries</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
            <div className="text-2xl font-black text-white">{totalCount.toLocaleString()}</div>
            <div className="text-xs text-[#B8AA96]">Records</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="h-[360px] w-full md:h-[460px]"
            role="img"
            aria-label="World map of collection countries"
          >
            <defs>
              <filter id="mapGlow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect width={width} height={height} fill="transparent" />

            {geographies.map((geo: any) => {
              const name = geo.properties?.name || ""
              const row = countryMap.get(normalizeCountry(name))
              const d = path(geo)

              if (!d) return null

              return (
                <path
                  key={geo.id || name}
                  d={d}
                  fill={fillFor(name)}
                  stroke={row ? "rgba(103, 232, 249, 0.55)" : "rgba(148, 163, 184, 0.16)"}
                  strokeWidth={row ? 0.8 : 0.4}
                  filter={row ? "url(#mapGlow)" : undefined}
                  className="cursor-pointer transition-opacity hover:opacity-90"
                  onMouseMove={(event) => {
                    if (!row) {
                      setTooltip(null)
                      return
                    }

                    const rect = svgRef.current?.getBoundingClientRect()
                    setTooltip({
                      x: event.clientX - (rect?.left || 0) + 18,
                      y: event.clientY - (rect?.top || 0) + 18,
                      country: row.country,
                      count: row.count,
                      percentage: row.percentage,
                      topFormat: row.topFormat,
                      topLabel: row.topLabel,
                    })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })}
          </svg>

          {tooltip && (
            <div
              className="pointer-events-none absolute z-20 w-72 rounded-2xl border border-white/15 bg-[#111111]/95 p-4 shadow-2xl backdrop-blur"
              style={{
                left: Math.min(tooltip.x, 680),
                top: Math.min(tooltip.y, 300),
              }}
            >
              <div className="text-base font-black text-white">
                {flagFor(tooltip.country)} {tooltip.country}
              </div>

              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[#8E8170]">Records</span>
                  <span className="font-bold text-white">{tooltip.count.toLocaleString()}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#8E8170]">Share</span>
                  <span className="font-bold text-cyan-200">{tooltip.percentage.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#8E8170]">Top Format</span>
                  <span className="font-bold text-white">{tooltip.topFormat || "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#8E8170]">Top Label</span>
                  <span className="max-w-36 truncate font-bold text-white">{tooltip.topLabel || "—"}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mx-auto mt-3 flex max-w-sm items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-[#B8AA96]">
            <span>Fewer</span>
            <div className="h-3 flex-1 rounded-full bg-gradient-to-r from-cyan-900 via-teal-400 to-lime-300" />
            <span>More</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111111]/80">
          <div className="border-b border-white/10 p-5">
            <h3 className="text-lg font-black text-white">Top Countries</h3>
            <p className="mt-1 text-xs text-[#8E8170]">Highest concentration in your collection.</p>
          </div>

          <div className="divide-y divide-white/10">
            {topCountries.map((row, index) => (
              <div key={row.country} className="grid grid-cols-[32px_1fr_auto_auto] items-center gap-3 px-5 py-4 text-sm">
                <div className="text-[#8E8170]">{index + 1}</div>
                <div className="font-semibold text-white">
                  {flagFor(row.country)} {row.country}
                </div>
                <div className="font-bold text-white">{row.count.toLocaleString()}</div>
                <div className="w-16 text-right font-bold text-lime-300">{row.percentage.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
