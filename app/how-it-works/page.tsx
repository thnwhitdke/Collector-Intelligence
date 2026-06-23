import Link from "next/link";

export const dynamic = "force-static";

const stats = [
  ["5,000,434", "Releases analyzed"],
  ["757,011", "Artists indexed"],
  ["413,591", "Labels indexed"],
  ["Millions", "Intelligence signals"],
];

const discoveries = [
  ["Find Hidden Rarity", "Identify uncommon releases hiding in plain sight."],
  ["Understand Demand", "See what collectors are actively pursuing."],
  ["Discover Collection DNA", "Understand the patterns that define your collection."],
  ["Track Market Signals", "Spot trends before they become obvious."],
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#F4EFE6]">
      <section className="mx-auto max-w-7xl px-6 py-14">
        <nav className="mb-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-black tracking-tight">
            Collector <span className="text-violet-400">Intelligence</span>
          </Link>
          <div className="flex gap-5 text-sm text-[#B8AA96]">
            <Link href="/">Home</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Login</Link>
          </div>
        </nav>

        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="text-sm font-black uppercase tracking-[0.4em] text-violet-400">
              Collection Intelligence
            </div>
            <h1 className="mt-5 text-5xl font-black leading-tight md:text-7xl">
              Your Collection Has a Story.
            </h1>
            <p className="mt-5 text-2xl font-black text-violet-400">
              Collector Intelligence helps you read it.
            </p>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#C8BDAE]">
              Analyze rarity, demand, artist influence, market activity, and
              collection patterns across more than 5 million releases.
            </p>
            <Link
              href="/auth/sign-up"
              className="mt-8 inline-flex rounded-2xl bg-violet-500 px-7 py-4 font-black text-white shadow-lg shadow-violet-950/50"
            >
              Start Exploring Your Collection
            </Link>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute right-10 top-8 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-[#111111] p-8 shadow-2xl">
              <div className="mb-6 text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
                Example Intelligence Profile
              </div>
              <div className="rounded-3xl bg-black p-6">
                <div className="text-3xl font-black">The Beatles</div>
                <div className="mt-2 text-[#B8AA96]">
                  Sgt. Pepper&apos;s Lonely Hearts Club Band
                </div>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <Metric label="CI Score" value="91" />
                  <Metric label="Demand" value="High" />
                  <Metric label="Supply" value="Low" />
                  <Metric label="Momentum" value="Rising" />
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 h-44 w-44 rounded-full border-[28px] border-[#111] bg-black shadow-2xl">
                <div className="m-auto mt-14 h-16 w-16 rounded-full bg-violet-500" />
              </div>
            </div>
          </div>
        </div>

        <section className="mt-16 grid gap-4 rounded-3xl border border-white/10 bg-[#101014] p-6 md:grid-cols-4">
          {stats.map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-black/30 p-5">
              <div className="text-3xl font-black text-violet-400">{value}</div>
              <div className="mt-1 text-sm text-[#B8AA96]">{label}</div>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-3">
          <FeatureCard
            number="1"
            title="Collection DNA"
            body="Collector Intelligence identifies the patterns that make your collection uniquely yours."
            lines={["4,200 records", "The Beatles · 11%", "Classic Rock · 32%", "317 artists"]}
          />
          <FeatureCard
            number="2"
            title="Artist Intelligence"
            body="Discover which artists define your collection and where your deepest expertise exists."
            lines={["The Beatles", "Artist IQ · 92", "Rare releases · 34", "Market demand · High"]}
          />
          <FeatureCard
            number="3"
            title="Market Intelligence"
            body="Identify releases with unusual collector demand, rarity, and market behavior."
            lines={["Collector Intelligence Score · 91", "Demand · High", "Supply pressure · Low", "Momentum · Rising"]}
          />
        </section>

        <section className="mt-14 rounded-3xl border border-white/10 bg-[#101014] p-8">
          <h2 className="text-center text-3xl font-black">
            What Makes Collector Intelligence Different?
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Compare title="Traditional Collection Apps" items={["Catalog records", "Show values", "Track ownership", "Display listings", "Store information"]} />
            <Compare title="Collector Intelligence" highlight items={["Analyze collections", "Explain significance", "Reveal patterns", "Identify opportunities", "Generate intelligence"]} />
          </div>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-4">
          {discoveries.map(([title, body]) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-[#111111] p-6">
              <div className="mb-4 h-12 w-12 rounded-2xl bg-violet-500/20" />
              <h3 className="font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#B8AA96]">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-[2rem] border border-violet-500/20 bg-gradient-to-r from-[#171020] to-[#090909] p-10">
          <h2 className="text-4xl font-black">Stop Cataloging. Start Understanding.</h2>
          <p className="mt-4 max-w-2xl text-[#C8BDAE]">
            Your collection already contains intelligence. Collector Intelligence
            helps reveal rarity, demand, artist influence, market behavior, and
            collection identity.
          </p>
          <Link
            href="/auth/sign-up"
            className="mt-8 inline-flex rounded-2xl bg-violet-500 px-7 py-4 font-black text-white"
          >
            Start Exploring Your Collection
          </Link>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#151515] p-4">
      <div className="text-2xl font-black text-cyan-300">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-[#B8AA96]">{label}</div>
    </div>
  );
}

function FeatureCard({ number, title, body, lines }: { number: string; title: string; body: string; lines: string[] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#111111] p-7">
      <div className="mb-5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-violet-500 font-black">
        {number}
      </div>
      <h3 className="text-2xl font-black">{title}</h3>
      <div className="mt-5 space-y-3">
        {lines.map((line) => (
          <div key={line} className="rounded-xl bg-black/30 px-4 py-3 text-sm text-[#F4EFE6]">
            {line}
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm leading-6 text-[#B8AA96]">{body}</p>
    </div>
  );
}

function Compare({ title, items, highlight = false }: { title: string; items: string[]; highlight?: boolean }) {
  return (
    <div>
      <h3 className={`font-black ${highlight ? "text-violet-400" : "text-[#F4EFE6]"}`}>{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item} className="rounded-xl bg-black/30 px-4 py-3 text-sm text-[#C8BDAE]">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
