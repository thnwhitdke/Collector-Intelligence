import Link from "next/link";

const signals = [
  "Portfolio Intelligence",
  "Market Behavior",
  "Autonomous Enrichment",
  "Track Intelligence",
  "Pressing Intelligence",
  "Collector IQ",
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050403] text-[#F4EFE6]">
      <div className="absolute inset-0">
        <div className="absolute left-[-12%] top-[-16%] h-[620px] w-[620px] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute right-[-14%] top-[18%] h-[680px] w-[680px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-24%] left-[30%] h-[620px] w-[620px] rounded-full bg-[#D8B65A]/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_34%)]" />
        <div className="absolute inset-0 opacity-[0.035]">
          <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] bg-[size:72px_72px]" />
        </div>
      </div>

      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <Link href="/" className="flex items-center gap-4">
            <img src="/icon.svg" alt="Collector Intelligence" className="h-11 w-11 rounded-xl" />

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#D8B65A]">
                Collector Intelligence
              </p>
              <h1 className="mt-1 text-lg font-black text-white">
                Intelligence OS
              </h1>
            </div>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-neutral-200 transition hover:bg-white/5"
            >
              Login
            </Link>

            <Link
              href="/auth/signup"
              className="rounded-2xl bg-[#C7A45D] px-5 py-3 text-sm font-black text-black transition hover:bg-[#D8B86A]"
            >
              Create Account
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-14 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-28">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit rounded-full border border-[#C7A45D]/30 bg-[#C7A45D]/10 px-5 py-2 text-xs font-black uppercase tracking-[0.28em] text-[#D8B86A]">
            The Intelligence Layer for Serious Music Collectors
          </div>

          <h2 className="mt-8 max-w-4xl text-6xl font-black leading-[0.92] tracking-tight md:text-8xl">
            Beyond
            <br />
            Cataloging.
            <br />
            <span className="bg-gradient-to-r from-[#FFD21E] via-[#D8B65A] to-[#FF9D00] bg-clip-text text-transparent">
              Into Intelligence.
            </span>
          </h2>

          <p className="mt-8 max-w-2xl text-lg leading-8 text-[#B8AA96]">
            Collector Intelligence turns your private music archive into a living
            portfolio system — tracking value, rarity, market behavior,
            enrichment, track data, and collector-grade signals over time.
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
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-7 py-4 text-sm font-bold transition hover:bg-white/5"
            >
              Access Dashboard
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap gap-3">
            {signals.map((signal) => (
              <div
                key={signal}
                className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-bold text-[#B8AA96]"
              >
                {signal}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="relative w-full max-w-[560px]">
            <div className="rounded-[40px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-2xl">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8E8170]">
                    Portfolio Intelligence
                  </p>

                  <h3 className="mt-2 text-5xl font-black text-white">
                    $128,450
                  </h3>
                </div>

                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-200">
                  ↗ +12.8%
                </div>
              </div>

              <div className="mt-7 overflow-hidden rounded-3xl border border-white/10 bg-black/35">
                <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
                    Live Signal Ticker
                  </p>
                </div>

                <div className="flex gap-3 overflow-hidden px-4 py-4">
                  {["Thin Market", "Value Leader", "Rarity Spike", "Track Sync"].map((item) => (
                    <span
                      key={item}
                      className="whitespace-nowrap rounded-full border border-[#D8B65A]/20 bg-[#D8B65A]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#F4CD68]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-7 h-44 rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="flex h-full items-end gap-3">
                  <div className="h-[28%] w-full rounded-t-xl bg-white/10" />
                  <div className="h-[36%] w-full rounded-t-xl bg-white/10" />
                  <div className="h-[46%] w-full rounded-t-xl bg-white/10" />
                  <div className="h-[42%] w-full rounded-t-xl bg-white/10" />
                  <div className="h-[62%] w-full rounded-t-xl bg-cyan-400/45" />
                  <div className="h-[78%] w-full rounded-t-xl bg-fuchsia-400/45" />
                  <div className="h-[95%] w-full rounded-t-xl bg-[#C7A45D]" />
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <IntelBox title="Market Momentum" value="Strong Uptrend" body="Demand signals increasing across tracked releases." tone="text-fuchsia-100" />
                <IntelBox title="Collection IQ" value="91 / 100" body="Rarity, depth, and portfolio quality detected." tone="text-cyan-100" />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Mini label="Records" value="4,218" />
                <Mini label="Top Movers" value="42" accent="text-fuchsia-100" />
                <Mini label="Rare Finds" value="18" accent="text-cyan-100" />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 backdrop-blur-xl">
                <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200">
                  System Status
                </p>
                <p className="mt-1 text-base font-black text-white">
                  Intelligence Engine Active
                </p>
              </div>

              <div className="rounded-3xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-5 py-4 backdrop-blur-xl">
                <p className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-200">
                  Market Alerts
                </p>
                <p className="mt-1 text-base font-black text-white">
                  9 New Signals
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 lg:px-10">
        <div className="mb-10">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D8B86A]">
            Platform Moat
          </p>

          <h3 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-5xl">
            Most collections are stored. Few are understood.
          </h3>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Feature
            tag="Behavior"
            title="Market Behavior Intelligence"
            body="Track momentum, scarcity, supply pressure, value signals, and price behavior across your archive."
            color="cyan"
          />

          <Feature
            tag="Automation"
            title="Autonomous Collection Engine"
            body="Enrich metadata, artwork, track listings, market values, and repair queues through background intelligence."
            color="fuchsia"
          />

          <Feature
            tag="Portfolio"
            title="Collector Portfolio OS"
            body="Understand your collection as a living portfolio with exposure, concentration, rarity, and opportunity signals."
            color="gold"
          />
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center lg:px-10">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D8B86A]">
            Collector Intelligence OS
          </p>

          <h3 className="mt-6 text-5xl font-black leading-tight tracking-tight md:text-6xl">
            Build Your
            <br />
            Intelligence Layer.
          </h3>

          <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-[#B8AA96]">
            Move beyond spreadsheets and static lists. Build a collector archive
            that learns, monitors, scores, and explains what your collection is
            becoming.
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
              className="rounded-2xl border border-white/10 px-8 py-4 text-sm font-bold transition hover:bg-white/5"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-6 py-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-[#7B7368] md:flex-row">
          <p>Collector Intelligence — the intelligence layer for serious collectors.</p>

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

function IntelBox({
  title,
  value,
  body,
  tone,
}: {
  title: string;
  value: string;
  body: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] uppercase tracking-[0.15em] text-[#8E8170]">
        {title}
      </p>
      <p className={`mt-2 text-xl font-black ${tone}`}>{value}</p>
      <p className="mt-2 text-sm text-[#B8AA96]">{body}</p>
    </div>
  );
}

function Mini({
  label,
  value,
  accent = "text-white",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] uppercase tracking-[0.15em] text-[#8E8170]">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-black ${accent}`}>{value}</p>
    </div>
  );
}

function Feature({
  tag,
  title,
  body,
  color,
}: {
  tag: string;
  title: string;
  body: string;
  color: "cyan" | "fuchsia" | "gold";
}) {
  const styles = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    fuchsia: "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200",
    gold: "border-[#C7A45D]/20 bg-[#C7A45D]/10 text-[#D8B86A]",
  };

  return (
    <div className="rounded-[34px] border border-white/10 bg-white/[0.035] p-8 backdrop-blur-xl transition hover:-translate-y-1 hover:border-[#D8B65A]/25">
      <div className={`mb-5 inline-flex rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${styles[color]}`}>
        {tag}
      </div>

      <h4 className="text-2xl font-black">{title}</h4>

      <p className="mt-4 leading-8 text-[#B8AA96]">{body}</p>
    </div>
  );
}
