'use client'

import { motion } from 'framer-motion'
import {
  Globe,
  TrendingUp,
  Database,
  Sparkles,
  BarChart3,
  Disc3,
  Search,
} from 'lucide-react'

export default function ReportsAnalyticsPage() {
  const metrics = [
    {
      label: 'Collection Value',
      value: '$140,901.88',
      icon: TrendingUp,
      accent: 'from-yellow-400 to-orange-500',
    },
    {
      label: 'Records Indexed',
      value: '2,860',
      icon: Database,
      accent: 'from-cyan-400 to-blue-500',
    },
    {
      label: 'Median Value',
      value: '$49',
      icon: BarChart3,
      accent: 'from-fuchsia-400 to-purple-500',
    },
    {
      label: 'Countries',
      value: '45',
      icon: Globe,
      accent: 'from-emerald-400 to-green-500',
    },
  ]

  const records = [
    {
      artist: 'David Bowie',
      release: 'Liza Jane',
      value: '$3,733.25',
      growth: '+18%',
    },
    {
      artist: 'Nirvana',
      release: 'Nevermind',
      value: '$1,890.00',
      growth: '+12%',
    },
    {
      artist: 'Smashing Pumpkins',
      release: 'Oceania',
      value: '$1,620.00',
      growth: '+31%',
    },
    {
      artist: 'Pink Floyd',
      release: 'Wish You Were Here',
      value: '$1,120.00',
      growth: '+22%',
    },
  ]

  const regionCards = [
    {
      name: 'North America',
      color: 'bg-yellow-400',
      glow: 'shadow-[0_0_16px_rgba(255,196,0,0.8)]',
      text: 'Highest collection value concentration and strongest collector trading activity.',
      border: 'border-yellow-400/10',
      background: 'bg-yellow-400/5',
      textColor: 'text-yellow-200',
    },
    {
      name: 'Europe',
      color: 'bg-cyan-400',
      glow: 'shadow-[0_0_16px_rgba(59,130,246,0.8)]',
      text: 'High metadata density and active rare pressing marketplace.',
      border: 'border-cyan-400/10',
      background: 'bg-cyan-400/5',
      textColor: 'text-cyan-200',
    },
    {
      name: 'Asia',
      color: 'bg-fuchsia-400',
      glow: 'shadow-[0_0_16px_rgba(217,70,239,0.8)]',
      text: 'Fastest emerging market growth and increasing collector demand.',
      border: 'border-fuchsia-400/10',
      background: 'bg-fuchsia-400/5',
      textColor: 'text-fuchsia-200',
    },
    {
      name: 'Oceania',
      color: 'bg-emerald-400',
      glow: 'shadow-[0_0_16px_rgba(16,185,129,0.8)]',
      text: 'Emerging niche collector ecosystems and specialty releases.',
      border: 'border-emerald-400/10',
      background: 'bg-emerald-400/5',
      textColor: 'text-emerald-200',
    },
  ]

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020202] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-[600px] w-[600px] rounded-full bg-yellow-500/10 blur-[180px]" />
        <div className="absolute right-0 top-0 h-[700px] w-[700px] rounded-full bg-blue-500/10 blur-[220px]" />
        <div className="absolute bottom-0 left-1/3 h-[600px] w-[600px] rounded-full bg-fuchsia-500/10 blur-[220px]" />

        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1800px] flex-col gap-8 px-6 py-8 lg:px-10">
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-[42px] border border-white/10 bg-[#060606]/95 p-10 shadow-[0_0_80px_rgba(255,196,0,0.08)] backdrop-blur-2xl"
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at top left, rgba(255,196,0,0.15), transparent 25%), radial-gradient(circle at bottom right, rgba(59,130,246,0.12), transparent 30%)',
            }}
          />

          <div className="relative z-10 grid gap-10 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-5 py-2 text-xs font-black uppercase tracking-[0.35em] text-yellow-300">
                <Sparkles className="h-4 w-4" />
                Collector Intelligence
              </div>

              <h1 className="mt-6 max-w-4xl text-6xl font-black leading-[0.9] tracking-[-0.04em] md:text-8xl">
                Reports &
                <span className="bg-gradient-to-r from-yellow-300 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
                  {' '}
                  Analytics
                </span>
              </h1>

              <p className="mt-8 max-w-2xl text-xl leading-relaxed text-zinc-400">
                Luxury-grade collection intelligence engineered for serious collectors.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-transparent to-blue-500/10" />

              <div className="relative z-10 flex flex-col gap-5">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                    <Search className="h-4 w-4" />
                    Search Metadata
                  </div>

                  <input
                    placeholder="Search artist, release, pressing, catalog..."
                    className="h-16 w-full rounded-2xl border border-white/10 bg-black/50 px-6 text-lg text-white outline-none transition-all duration-300 placeholder:text-zinc-600 focus:border-yellow-400/40"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <select className="h-14 rounded-2xl border border-white/10 bg-black/50 px-5 text-white outline-none transition-all duration-300 focus:border-yellow-400/40">
                    <option>All Countries</option>
                    <option>United States</option>
                    <option>United Kingdom</option>
                    <option>Germany</option>
                    <option>Japan</option>
                  </select>

                  <select className="h-14 rounded-2xl border border-white/10 bg-black/50 px-5 text-white outline-none transition-all duration-300 focus:border-yellow-400/40">
                    <option>All Genres</option>
                    <option>Rock</option>
                    <option>Alternative</option>
                    <option>Electronic</option>
                    <option>Jazz</option>
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <button className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-5 text-sm font-black uppercase tracking-[0.25em] text-black transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,196,0,0.35)]">
                    Enrich Metadata
                  </button>

                  <button className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5 text-sm font-bold uppercase tracking-[0.25em] text-white transition-all duration-300 hover:border-cyan-400/40 hover:bg-cyan-400/10">
                    Open Collection
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {metrics.map((metric, index) => {
            const Icon = metric.icon

            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[#050505]/90 p-7"
              >
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                      {metric.label}
                    </div>

                    <div className="mt-5 truncate text-4xl font-black tracking-tight text-white 2xl:text-5xl">
                      {metric.value}
                    </div>
                  </div>

                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${metric.accent}`}>
                    <Icon className="h-7 w-7 text-black" />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-[#050505]/95 p-8">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at top left, rgba(255,196,0,0.1), transparent 25%), radial-gradient(circle at bottom right, rgba(59,130,246,0.12), transparent 30%)',
              }}
            />

            <div className="relative z-10 flex flex-col gap-8">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-4xl">
                  <div className="flex items-center gap-3">
                    <Globe className="h-8 w-8 text-yellow-400" />

                    <h2 className="text-5xl font-black tracking-tight text-white">
                      Global Density
                    </h2>
                  </div>

                  <p className="mt-4 text-lg leading-relaxed text-zinc-400">
                    Real-time geographic concentration mapping showing where your collection inventory, value density, and collector activity are strongest worldwide.
                  </p>
                </div>

                <div className="w-fit rounded-3xl border border-yellow-400/20 bg-yellow-400/10 px-6 py-5 backdrop-blur-xl">
                  <div className="text-xs font-black uppercase tracking-[0.3em] text-yellow-300">
                    Active Regions
                  </div>

                  <div className="mt-2 text-5xl font-black text-white">
                    45
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {regionCards.map((region) => (
                  <div
                    key={region.name}
                    className={`flex items-start gap-3 rounded-2xl border ${region.border} ${region.background} p-4`}
                  >
                    <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${region.color} ${region.glow}`} />

                    <div>
                      <div className={`text-sm font-black ${region.textColor}`}>
                        {region.name}
                      </div>

                      <div className="mt-1 text-xs leading-relaxed text-zinc-400">
                        {region.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-black">
                <div
                  className="relative h-[650px] overflow-hidden"
                  style={{
                    background:
                      'radial-gradient(circle at center, #101827 0%, #040404 78%)',
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.24] mix-blend-screen">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg"
                      alt="World Map"
                      className="h-[88%] w-[88%] object-contain invert brightness-200 contrast-125"
                    />
                  </div>

                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage:
                        'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                      backgroundSize: '72px 72px',
                    }}
                  />

                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(circle at 28% 42%, rgba(255,196,0,0.20), transparent 18%), radial-gradient(circle at 55% 36%, rgba(59,130,246,0.22), transparent 20%), radial-gradient(circle at 73% 42%, rgba(217,70,239,0.18), transparent 18%), radial-gradient(circle at 78% 68%, rgba(16,185,129,0.14), transparent 16%)',
                    }}
                  />

                  <svg
                    viewBox="0 0 1200 600"
                    className="absolute inset-0 h-full w-full opacity-50"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M260 240 C430 180 540 200 720 230"
                      stroke="rgba(255,196,0,0.45)"
                      strokeWidth={2}
                      fill="none"
                      strokeDasharray="10 10"
                    />

                    <path
                      d="M720 230 C820 260 900 330 980 420"
                      stroke="rgba(59,130,246,0.4)"
                      strokeWidth={2}
                      fill="none"
                      strokeDasharray="10 10"
                    />

                    <circle cx="260" cy="240" r="6" fill="rgba(255,196,0,0.9)" />
                    <circle cx="720" cy="230" r="6" fill="rgba(59,130,246,0.9)" />
                    <circle cx="980" cy="420" r="6" fill="rgba(16,185,129,0.9)" />

                    <text x="210" y="220" fill="rgba(255,255,255,0.9)" fontSize="18" fontWeight="700">
                      North America
                    </text>

                    <text x="675" y="210" fill="rgba(255,255,255,0.9)" fontSize="18" fontWeight="700">
                      Europe
                    </text>

                    <text x="925" y="455" fill="rgba(255,255,255,0.9)" fontSize="18" fontWeight="700">
                      Oceania
                    </text>
                  </svg>

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />

                  <div className="absolute bottom-0 left-0 right-0 grid gap-4 p-6 md:grid-cols-4">
                    {[
                      ['US', '1,198 Records'],
                      ['GB', '603 Records'],
                      ['DE', '292 Records'],
                      ['FR', '93 Records'],
                    ].map(([country, amount]) => (
                      <div
                        key={country}
                        className="rounded-3xl border border-white/10 bg-black/50 p-5 backdrop-blur-2xl"
                      >
                        <div className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                          {country}
                        </div>

                        <div className="mt-3 text-2xl font-black text-white">
                          {amount}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-[#050505]/95 p-8">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at top right, rgba(217,70,239,0.15), transparent 35%)',
              }}
            />

            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <Disc3 className="h-8 w-8 text-fuchsia-400" />

                <h2 className="text-5xl font-black tracking-tight text-white">
                  Top Records
                </h2>
              </div>

              <div className="mt-8 space-y-5">
                {records.map((record, index) => (
                  <motion.div
                    key={record.release}
                    whileHover={{ scale: 1.015 }}
                    className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] p-6"
                  >
                    <div className="flex items-center gap-5">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-2xl font-black text-black">
                        #{index + 1}
                      </div>

                      <div className="flex-1">
                        <div className="text-xl font-black text-white">
                          {record.artist}
                        </div>

                        <div className="mt-1 text-sm text-zinc-500">
                          {record.release}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-3xl font-black text-yellow-300">
                          {record.value}
                        </div>

                        <div className="mt-2 text-sm font-bold text-emerald-400">
                          {record.growth}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
