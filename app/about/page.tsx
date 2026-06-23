import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
          Collector Intelligence
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">
          Built for collectors who want to understand what they own.
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          Collector Intelligence combines collection management, rarity analysis,
          valuation consensus, market signals, and portfolio intelligence into a
          single platform for serious music collectors.
        </p>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {[
            "Collection management",
            "Market intelligence",
            "Rarity analysis",
            "Portfolio valuation",
            "Daily briefings",
            "Native mobile companion app",
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="font-bold text-slate-100">{item}</p>
            </div>
          ))}
        </section>

        <p className="mt-10 text-slate-400">
          Collector Intelligence is not a marketplace. It is an intelligence layer
          for collectors who want better context, better organization, and better
          insight into their collections.
        </p>

        <Link href="/pricing" className="mt-8 inline-flex rounded-xl bg-amber-300 px-5 py-3 font-black text-slate-950">
          View Pricing
        </Link>
      </div>
    </main>
  );
}
