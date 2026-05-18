import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090909] text-[#F4EFE6]">
      {/* BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_35%)]" />

        <div className="absolute inset-0 opacity-[0.04]">
          <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:70px_70px]" />
        </div>
      </div>

      {/* HEADER */}
      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#D8B86A]">
              Collector Intelligence
            </p>

            <h1 className="mt-1 text-lg font-bold tracking-wide text-white">
              Collection Intelligence Platform
            </h1>
          </div>

          <nav className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-neutral-200 transition hover:bg-white/5"
            >
              Login
            </Link>

            <Link
              href="/auth/signup"
              className="rounded-2xl bg-[#C7A45D] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#D8B86A]"
            >
              Create Account
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 mx-auto grid max-w-7xl gap-16 px-6 py-20 lg:grid-cols-2 lg:px-10 lg:py-28">
        {/* LEFT SIDE */}
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#C7A45D]/30 bg-[#C7A45D]/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-[#D8B86A]">
            Built For Serious Collectors
          </div>

          <h2 className="mt-8 text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
            Understand
            <br />
            Your Collection
            <br />
            Like Never Before
          </h2>

          <p className="mt-8 max-w-2xl text-lg leading-8 text-[#B8AA96]">
            Collector Intelligence transforms your collection into a living
            portfolio intelligence system with market analytics, automated
            enrichment, rarity detection, valuation insights, and momentum
            tracking.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/auth/signup"
              className="rounded-2xl bg-[#C7A45D] px-7 py-4 text-sm font-black text-black transition hover:bg-[#D8B86A]"
            >
              Start Building Your Archive
            </Link>

            <Link
              href="/auth/login"
              className="rounded-2xl border border-white/10 px-7 py-4 text-sm font-semibold transition hover:bg-white/5"
            >
              Access Dashboard
            </Link>
          </div>

          {/* LIVE STATS */}
          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#8E8170]">
                Portfolio Tracking
              </p>

              <p className="mt-3 text-3xl font-black">Live</p>

              <p className="mt-2 text-sm text-[#B8AA96]">
                Real-time collection intelligence
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#8E8170]">
                Market Signals
              </p>

              <p className="mt-3 text-3xl font-black text-fuchsia-100">
                Active
              </p>

              <p className="mt-2 text-sm text-[#B8AA96]">
                Momentum and value analytics
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#8E8170]">
                Intelligence Engine
              </p>

              <p className="mt-3 text-3xl font-black text-cyan-100">
                Online
              </p>

              <p className="mt-2 text-sm text-[#B8AA96]">
                Automated enrichment systems
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="relative flex items-center justify-center">
          <div className="relative w-full max-w-[520px]">
            {/* MAIN PANEL */}
            <div className="rounded-[36px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-[#8E8170]">
                    Portfolio Intelligence
                  </p>

                  <h3 className="mt-2 text-4xl font-black">
                    $128,450
                  </h3>
                </div>

                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-200">
                  +12.8%
                </div>
              </div>

              {/* CHART MOCKUP */}
              <div className="mt-8 h-40 rounded-3xl border border-white/10 bg-black/30 p-4">
                <div className="flex h-full items-end gap-2">
                  <div className="h-[28%] w-full rounded-t-xl bg-white/10" />
                  <div className="h-[34%] w-full rounded-t-xl bg-white/10" />
                  <div className="h-[45%] w-full rounded-t-xl bg-white/10" />
                  <div className="h-[40%] w-full rounded-t-xl bg-white/10" />
                  <div className="h-[58%] w-full rounded-t-xl bg-cyan-400/40" />
                  <div className="h-[72%] w-full rounded-t-xl bg-fuchsia-400/40" />
                  <div className="h-[90%] w-full rounded-t-xl bg-[#C7A45D]" />
                </div>
              </div>

              {/* MARKET SIGNALS */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#8E8170]">
                    Market Momentum
                  </p>

                  <p className="mt-2 text-xl font-black text-fuchsia-100">
                    Strong Uptrend
                  </p>

                  <p className="mt-2 text-sm text-[#B8AA96]">
                    Demand signals increasing across tracked releases.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#8E8170]">
                    Collection IQ
                  </p>

                  <p className="mt-2 text-xl font-black text-cyan-100">
                    91 / 100
                  </p>

                  <p className="mt-2 text-sm text-[#B8AA96]">
                    Exceptional rarity and portfolio quality detected.
                  </p>
                </div>
              </div>

              {/* MINI CARDS */}
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#8E8170]">
                    Records
                  </p>

                  <p className="mt-2 text-2xl font-black">4,218</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#8E8170]">
                    Top Movers
                  </p>

                  <p className="mt-2 text-2xl font-black text-fuchsia-100">
                    42
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#8E8170]">
                    Rare Finds
                  </p>

                  <p className="mt-2 text-2xl font-black text-cyan-100">
                    18
                  </p>
                </div>
              </div>
            </div>

            {/* FLOATING STATUS */}
            <div className="absolute -bottom-6 -left-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 px-6 py-4 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200">
                System Status
              </p>

              <p className="mt-1 text-lg font-black text-white">
                Intelligence Engine Active
              </p>
            </div>

            <div className="absolute -right-6 top-10 rounded-3xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-6 py-4 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-200">
                Market Alerts
              </p>

              <p className="mt-1 text-lg font-black text-white">
                9 New Signals
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 lg:px-10">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[#D8B86A]">
            Platform Capabilities
          </p>

          <h3 className="mt-4 text-4xl font-black tracking-tight">
            Built Beyond Basic Collection Tracking
          </h3>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">
            <div className="mb-5 inline-flex rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyan-200">
              Intelligence
            </div>

            <h4 className="text-2xl font-black">
              Market Analytics
            </h4>

            <p className="mt-4 leading-8 text-[#B8AA96]">
              Monitor collection value, rarity signals, market momentum,
              inventory scarcity, and valuation confidence across your archive.
            </p>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">
            <div className="mb-5 inline-flex rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-fuchsia-200">
              Automation
            </div>

            <h4 className="text-2xl font-black">
              Autonomous Enrichment
            </h4>

            <p className="mt-4 leading-8 text-[#B8AA96]">
              Automatically enrich records with metadata, artwork, pricing,
              market data, and intelligence-driven collection insights.
            </p>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">
            <div className="mb-5 inline-flex rounded-2xl border border-[#C7A45D]/20 bg-[#C7A45D]/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#D8B86A]">
              Portfolio
            </div>

            <h4 className="text-2xl font-black">
              Collector Portfolio Intelligence
            </h4>

            <p className="mt-4 leading-8 text-[#B8AA96]">
              Transform your collection into a structured intelligence system
              with dashboards, trends, signals, and portfolio visibility.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t border-white/10">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center lg:px-10">
          <p className="text-xs uppercase tracking-[0.35em] text-[#D8B86A]">
            Collector Intelligence Platform
          </p>

          <h3 className="mt-6 text-5xl font-black leading-tight tracking-tight">
            Your Collection
            <br />
            Deserves More Than a Spreadsheet
          </h3>

          <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-[#B8AA96]">
            Build a living collector archive powered by intelligence,
            automation, market analytics, and portfolio insight.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="rounded-2xl bg-[#C7A45D] px-8 py-4 text-sm font-black text-black transition hover:bg-[#D8B86A]"
            >
              Create Your Archive
            </Link>

            <Link
              href="/auth/login"
              className="rounded-2xl border border-white/10 px-8 py-4 text-sm font-semibold transition hover:bg-white/5"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/10 px-6 py-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-[#7B7368] md:flex-row">
          <p>
            Collector Intelligence — Portfolio analytics for serious collectors.
          </p>

          <div className="flex items-center gap-6">
            <Link href="/auth/login" className="hover:text-white">
              Login
            </Link>

            <Link href="/auth/signup" className="hover:text-white">
              Register
            </Link>

            <Link href="/collection" className="hover:text-white">
              Collection
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}