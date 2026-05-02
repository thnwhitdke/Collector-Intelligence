import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0d1117] text-[#f4efe6]">
      
      {/* HEADER */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <h1 className="text-lg tracking-widest text-[#d8b36a] font-semibold">
          COLLECTOR INTELLIGENCE
        </h1>

        <nav className="flex items-center gap-6 text-sm text-neutral-300">
          <Link href="/auth/login" className="hover:text-white transition">
            Login
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-full bg-[#d8b36a] px-4 py-2 text-black font-semibold hover:opacity-90 transition"
          >
            Register
          </Link>
        </nav>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-8 py-20 grid md:grid-cols-2 gap-12 items-center">
        
        {/* LEFT */}
        <div>
          <p className="text-xs tracking-[0.25em] text-[#d8b36a] mb-4">
            FOR SERIOUS COLLECTORS
          </p>

          <h2 className="text-5xl md:text-6xl font-semibold leading-tight">
            Know what you own.
            <br />
            Know what it’s worth.
          </h2>

          <p className="mt-6 text-neutral-400 max-w-xl leading-relaxed">
            Collector Intelligence transforms your record collection into a
            structured archive — with pricing insight, metadata quality tools,
            and a serious collector interface.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/auth/signup"
              className="rounded-full bg-[#d8b36a] px-6 py-3 font-semibold text-black hover:opacity-90 transition"
            >
              Start Your Collection
            </Link>

            <Link
              href="/auth/login"
              className="rounded-full border border-white/20 px-6 py-3 hover:bg-white/5 transition"
            >
              I Already Have an Account
            </Link>
          </div>
        </div>

        {/* RIGHT VISUAL */}
        <div className="flex justify-center">
          <div className="w-[260px] h-[260px] rounded-full bg-black border-[12px] border-black shadow-2xl relative">
            
            <div className="absolute inset-0 rounded-full
              [background:radial-gradient(circle,#d8b36a_0_6%,#111_7%_14%,#000_15%_100%)]
            " />

            <div className="absolute inset-6 rounded-full border border-[#d8b36a]/30" />
            <div className="absolute inset-12 rounded-full border border-white/10" />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-8 pb-20 grid md:grid-cols-3 gap-6">
        
        <div className="rounded-2xl border border-white/10 p-6 bg-white/5">
          <h3 className="text-[#d8b36a] text-lg mb-2">Catalog Everything</h3>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Track artist, title, label, year, condition, and collector-specific
            details with precision.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 p-6 bg-white/5">
          <h3 className="text-[#d8b36a] text-lg mb-2">Track Value</h3>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Compare purchase price, Discogs market data, and estimated value
            across your collection.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 p-6 bg-white/5">
          <h3 className="text-[#d8b36a] text-lg mb-2">Build an Archive</h3>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Move beyond spreadsheets — create a true visual archive of your
            collection.
          </p>
        </div>
      </section>

      {/* INTERNAL TOOLS (your existing functionality preserved) */}
      <section className="mx-auto max-w-6xl px-8 pb-20">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h4 className="text-sm uppercase tracking-widest text-neutral-400 mb-4">
            Tools
          </h4>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/collection"
              className="rounded-2xl bg-white text-black px-5 py-3 text-sm font-medium hover:opacity-90"
            >
              Open Collection
            </Link>

            <Link
              href="/import"
              className="rounded-2xl border border-white/20 px-5 py-3 text-sm hover:bg-white/10"
            >
              Import Records
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 px-8 py-6 text-sm text-neutral-500">
        Collector Intelligence — built for collectors who want more than a spreadsheet.
      </footer>
    </main>
  );
}