"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

type TickerItem = {
  kind: string
  label: string
  headline: string
  detail: string
  href: string
}

function tone(kind: string) {
  if (kind === "critical") return "border-red-400/30 bg-red-400/10 text-red-200"
  if (kind === "opportunity") return "border-yellow-400/30 bg-yellow-400/10 text-yellow-200"
  if (kind === "auction") return "border-purple-400/30 bg-purple-400/10 text-purple-200"
  if (kind === "geography") return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
  if (kind === "want") return "border-lime-400/30 bg-lime-400/10 text-lime-200"
  return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
}

export default function LiveCollectorTicker() {
  const [items, setItems] = useState<TickerItem[]>([])
  const [refreshedAt, setRefreshedAt] = useState<string>("")
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const res = await fetch("/api/collector-live-ticker", { cache: "no-store" })
      const json = await res.json()
      if (json?.ok) {
        setItems(json.items || [])
        setRefreshedAt(json.refreshedAt || "")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 60000)
    return () => clearInterval(timer)
  }, [])

  const tickerItems = useMemo(() => {
    if (!items.length) return []
    return [...items, ...items]
  }, [items])

  if (!items.length && !loading) return null

  return (
    <section className="mx-auto max-w-7xl px-6 pt-6">
      <div className="rounded-[2rem] border border-yellow-400/15 bg-gradient-to-br from-[#111111] via-black to-[#090909] p-5 shadow-2xl shadow-yellow-950/10">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300">
              Live Collector Intelligence
            </div>
            <h2 className="mt-2 text-2xl font-black text-white">Market Wire</h2>
            <p className="mt-1 text-sm text-[#8E8170]">
              Rotating portfolio, market, want-list, auction, and collection signals.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em]">
            <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-emerald-200">
              Auto-refresh 60s
            </div>
            <button
              type="button"
              onClick={load}
              className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-yellow-200"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            <span className="font-black uppercase tracking-[0.35em] text-emerald-300">Ticker</span>
            <span className="text-[#8E8170]">
              {refreshedAt ? `Updated ${new Date(refreshedAt).toLocaleTimeString()}` : "Loading"}
            </span>
          </div>

          <div className="relative flex overflow-hidden py-3">
            <div className="flex min-w-full animate-[ticker_70s_linear_infinite] gap-3 px-3 hover:[animation-play-state:paused]">
              {tickerItems.map((item, index) => (
                <Link
                  key={`${item.label}-${item.headline}-${index}`}
                  href={item.href || "/collection"}
                  className={`min-w-[360px] rounded-2xl border px-4 py-3 ${tone(item.kind)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-current" />
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.35em]">{item.label}</div>
                      <div className="mt-2 text-sm font-black text-white">{item.headline}</div>
                      <div className="mt-1 text-xs leading-5 text-[#B8AA96]">{item.detail}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {items.slice(0, 3).map((item, index) => (
            <Link
              key={`${item.headline}-${index}`}
              href={item.href || "/collection"}
              className="rounded-2xl border border-white/10 bg-[#111111] p-4 transition hover:bg-[#1A1A1A]"
            >
              <div className="text-xs font-black uppercase tracking-[0.3em] text-yellow-300">{item.label}</div>
              <div className="mt-3 text-lg font-black text-white">{item.headline}</div>
              <div className="mt-2 text-sm leading-6 text-[#B8AA96]">{item.detail}</div>
            </Link>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes ticker {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  )
}
