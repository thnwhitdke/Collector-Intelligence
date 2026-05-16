'use client'

export default function ReportsAnalyticsPage() {
  const topRecords = [
    {
      artist: 'David Bowie',
      album: 'Liza Jane',
      value: '$3,733.25',
      trend: '+18%',
    },
    {
      artist: 'Nirvana',
      album: 'Nevermind',
      value: '$1,890.00',
      trend: '+12%',
    },
    {
      artist: 'The Smashing Pumpkins',
      album: 'Oceania',
      value: '$1,620.00',
      trend: '+31%',
    },
    {
      artist: 'Radiohead',
      album: 'In Rainbows',
      value: '$1,442.90',
      trend: '+8%',
    },
    {
      artist: 'Pink Floyd',
      album: 'Wish You Were Here',
      value: '$1,120.10',
      trend: '+22%',
    },
  ]

  const regions = [
    {
      country: 'United States',
      code: 'US',
      count: '1,198',
      intensity: 'from-yellow-400/70 to-orange-500/40',
      glow: 'shadow-yellow-500/30',
    },
    {
      country: 'United Kingdom',
      code: 'GB',
      count: '603',
      intensity: 'from-cyan-400/60 to-blue-500/40',
      glow: 'shadow-cyan-500/30',
    },
    {
      country: 'Germany',
      code: 'DE',
      count: '292',
      intensity: 'from-fuchsia-400/60 to-purple-500/40',
      glow: 'shadow-fuchsia-500/30',
    },
    {
      country: 'France',
      code: 'FR',
      count: '93',
      intensity: 'from-emerald-400/60 to-green-500/40',
      glow: 'shadow-emerald-500/30',
    },
  ]

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-0 left-0 h-[500px] w-[500px] rounded-full bg-yellow-500 blur-[160px] opacity-20" />
        <div className="absolute top-40 right-0 h-[500px] w-[500px] rounded-full bg-blue-600 blur-[180px] opacity-20" />
        <div className="absolute bottom-0 left-1/3 h-[500px] w-[500px] rounded-full bg-fuchsia-700 blur-[180px] opacity-10" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1700px] px-6 py-8 lg:px-10">
        {/* Header */}
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-8 shadow-2xl shadow-yellow-500/10 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,215,0,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.15),transparent_35%)]" />

          <div className="relative z-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.35em] text-yellow-300 backdrop-blur-xl">
                Collector Intelligence
              </div>

              <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight text-white md:text-7xl">
                Reports & Analytics
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl">
                Enterprise-grade collection intelligence fused with market
                diagnostics, rarity heatmapping, metadata enrichment, valuation
                forecasting, and collector behavioral analytics.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <button className="group relative overflow-hidden rounded-2xl bg-yellow-400 px-7 py-4 text-sm font-black uppercase tracking-[0.2em] text-black transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/30">
                  <span className="relative z-10">
                    Launch Intelligence
                  </span>
                  <div className="absolute inset-0 translate-y-full bg-white/30 transition-transform duration-300 group-hover:translate-y-0" />
                </button>

                <button className="rounded-2xl border border-white/10 bg-white/5 px-7 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white backdrop-blur-xl transition-all duration-300 hover:border-yellow-400/30 hover:bg-yellow-400/10">
                  Collection Explorer
                </button>
              </div>
            </div>

            {/* Intelligence Control Panel */}
            <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-transparent to-blue-500/10" />

              <div className="relative z-10 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                    Search Metadata
                  </label>

                  <input
                    placeholder="Search artist, release, pressing..."
                    className="h-14 w-full rounded-2xl border border-white/10 bg-black/60 px-5 text-white outline-none transition-all duration-300 placeholder:text-zinc-600 focus:border-yellow-400/40 focus:ring-2 focus:ring-yellow-400/20"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <select className="h-14 rounded-2xl border border-white/10 bg-black/60 px-4 text-white outline-none transition-all duration-300 focus:border-yellow-400/40">
                    <option>All Countries</option>
                    <option>United States</option>
                    <option>United Kingdom</option>
                    <option>Germany</option>
                    <option>Japan</option>
                  </select>

                  <select className="h-14 rounded-2xl border border-white/10 bg-black/60 px-4 text-white outline-none transition-all duration-300 focus:border-yellow-400/40">
                    <option>All Genres</option>
                    <option>Alternative</option>
                    <option>Metal</option>
                    <option>Electronic</option>
                    <option>Jazz</option>
                  </select>
                </div>

                <select className="h-14 w-full rounded-2xl border border-white/10 bg-black/60 px-4 text-white outline-none transition-all duration-300 focus:border-yellow-400/40">
                  <option>All Formats</option>
                  <option>Vinyl</option>
                  <option>CD</option>
                  <option>Cassette</option>
                </select>

                <div className="grid gap-4 pt-2 md:grid-cols-2">
                  <button className="rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-500 px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-black transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-yellow-500/30">
                    Enrich Metadata
                  </button>

                  <button className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/40 hover:bg-cyan-400/10">
                    Open Collection
                  </button>
                </div>

                <div className="rounded-2xl border border-yellow-400/10 bg-black/40 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                        Enrichment Status
                      </div>

                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/60" />

                        <span className="text-lg font-bold text-white">
                          AI Systems Active
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-right">
                      <div className="text-xs uppercase tracking-[0.25em] text-emerald-300">
                        Accuracy
                      </div>

                      <div className="text-2xl font-black text-emerald-200">
                        98.7%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Metrics */}
        <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {[
            {
              title: 'Collection Value',
              value: '$140,901.88',
              glow: 'from-yellow-400/20 to-orange-500/5',
            },
            {
              title: 'Records',
              value: '2,860',
              glow: 'from-cyan-400/20 to-blue-500/5',
            },
            {
              title: 'Median Value',
              value: '$49',
              glow: 'from-fuchsia-400/20 to-purple-500/5',
            },
            {
              title: 'Countries',
              value: '45',
              glow: 'from-emerald-400/20 to-green-500/5',
            },
            {
              title: 'Collector IQ',
              value: '96',
              glow: 'from-red-400/20 to-pink-500/5',
            },
          ].map((metric) => (
            <div
              key={metric.title}
              className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-zinc-950/80 p-6 transition-all duration-500 hover:-translate-y-1 hover:border-yellow-400/30 hover:shadow-2xl"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${metric.glow} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
              />

              <div className="relative z-10">
                <div className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                  {metric.title}
                </div>

                <div className="mt-4 text-4xl font-black tracking-tight text-white">
                  {metric.value}
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Main Analytics Grid */}
        <section className="mt-10 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          {/* Global Map */}
          <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-8 shadow-2xl shadow-blue-500/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,215,0,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_35%)]" />

            <div className="relative z-10 flex items-start justify-between gap-6">
              <div>
                <h2 className="text-4xl font-black tracking-tight text-white">
                  Global Collection Density
                </h2>

                <p className="mt-3 text-lg text-zinc-400">
                  Geographic distribution heatmapping across your global archive.
                </p>
              </div>

              <div className="rounded-3xl border border-yellow-400/20 bg-yellow-400/10 px-6 py-4 backdrop-blur-xl">
                <div className="text-xs font-black uppercase tracking-[0.3em] text-yellow-300">
                  Active Regions
                </div>

                <div className="mt-2 text-5xl font-black text-white">
                  45
                </div>
              </div>
            </div>

            <div className="relative mt-10 overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#07111f] via-black to-[#0f172a] p-6">
              <div className="absolute inset-0 opacity-30 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

              <div className="relative flex min-h-[520px] items-center justify-center overflow-hidden rounded-[28px] border border-white/5 bg-black/40">
                <img
                  src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?q=80&w=2400&auto=format&fit=crop"
                  alt="Global Earth"
                  className="absolute inset-0 h-full w-full object-cover opacity-20"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                {/* Density Hotspots */}
                <div className="absolute left-[22%] top-[35%] h-32 w-32 rounded-full bg-yellow-400/40 blur-3xl" />
                <div className="absolute left-[48%] top-[28%] h-28 w-28 rounded-full bg-cyan-400/40 blur-3xl" />
                <div className="absolute left-[57%] top-[32%] h-24 w-24 rounded-full bg-fuchsia-500/40 blur-3xl" />
                <div className="absolute left-[70%] top-[42%] h-20 w-20 rounded-full bg-emerald-400/40 blur-3xl" />

                <div className="relative z-10 grid w-full gap-4 self-end md:grid-cols-4">
                  {regions.map((region) => (
                    <div
                      key={region.code}
                      className={`rounded-3xl border border-white/10 bg-gradient-to-br ${region.intensity} ${region.glow} p-5 backdrop-blur-2xl shadow-2xl`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-black uppercase tracking-[0.25em] text-white/80">
                          {region.code}
                        </div>

                        <div className="h-3 w-3 rounded-full bg-white shadow-lg" />
                      </div>

                      <div className="mt-4 text-3xl font-black text-white">
                        {region.count}
                      </div>

                      <div className="mt-1 text-sm text-white/70">
                        {region.country}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Top Records */}
          <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-8 shadow-2xl shadow-fuchsia-500/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.12),transparent_35%)]" />

            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-black tracking-tight text-white">
                  Top Records
                </h2>

                <p className="mt-3 text-lg text-zinc-400">
                  Highest-value assets in your collection ecosystem.
                </p>
              </div>

              <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-3 text-sm font-black uppercase tracking-[0.2em] text-fuchsia-200">
                Live Market
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {topRecords.map((record, index) => (
                <div
                  key={record.album}
                  className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:border-yellow-400/30 hover:bg-white/[0.05] hover:shadow-2xl hover:shadow-yellow-500/10"
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-yellow-400 via-orange-500 to-fuchsia-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="flex items-center gap-5">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-2xl font-black text-black shadow-lg shadow-yellow-500/30">
                      #{index + 1}
                    </div>

                    <div className="flex-1">
                      <div className="text-lg font-black text-white">
                        {record.artist}
                      </div>

                      <div className="mt-1 text-sm text-zinc-500">
                        {record.album}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black text-yellow-300">
                        {record.value}
                      </div>

                      <div className="mt-1 text-sm font-bold text-emerald-400">
                        {record.trend}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Intelligence Pulse */}
            <div className="mt-8 rounded-[28px] border border-cyan-400/10 bg-cyan-400/5 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
                    Market Pulse
                  </div>

                  <div className="mt-3 text-3xl font-black text-white">
                    Ultra Bullish
                  </div>
                </div>

                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-cyan-400/20 bg-black/40">
                  <div className="absolute inset-2 animate-pulse rounded-full border border-cyan-400/30" />

                  <span className="text-2xl font-black text-cyan-300">
                    94%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}