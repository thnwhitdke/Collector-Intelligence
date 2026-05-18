import Link from "next/link";
import { signup } from "./actions";

export default function SignupPage() {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#090909] text-[#F4EFE6]">
      {/* BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_35%)]" />

        <div className="absolute inset-0 opacity-[0.04]">
          <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:70px_70px]" />
        </div>
      </div>

      {/* LEFT SIDE */}
      <section className="relative hidden w-1/2 flex-col justify-between border-r border-white/10 p-16 lg:flex">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C7A45D]/30 bg-[#C7A45D]/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-[#D8B86A]">
            Collector Intelligence Platform
          </div>

          <h1 className="mt-10 max-w-xl text-6xl font-black leading-[1.05] tracking-tight">
            Build Your
            <br />
            Collection
            <br />
            Intelligence
            <br />
            Archive
          </h1>

          <p className="mt-8 max-w-lg text-lg leading-8 text-[#B7AA96]">
            Move beyond spreadsheets and basic collection apps. Build a living
            collector archive powered by market analytics, enrichment systems,
            rarity detection, and portfolio intelligence.
          </p>
        </div>

        {/* PLATFORM CAPABILITIES */}
        <div className="space-y-5">
          {/* STEP FLOW */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8E8170]">
              How It Works
            </p>

            <div className="mt-6 space-y-4">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7A45D]/20 bg-[#C7A45D]/10 text-sm font-black text-[#D8B86A]">
                  1
                </div>

                <div>
                  <p className="font-bold text-white">
                    Import Your Collection
                  </p>

                  <p className="mt-1 text-sm leading-6 text-[#B8AA96]">
                    Build your collector archive with records, metadata,
                    artwork, and grading information.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-sm font-black text-cyan-200">
                  2
                </div>

                <div>
                  <p className="font-bold text-white">
                    Enrich & Analyze
                  </p>

                  <p className="mt-1 text-sm leading-6 text-[#B8AA96]">
                    Automatically pull market data, valuation intelligence,
                    metadata, and collection insights.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 text-sm font-black text-fuchsia-200">
                  3
                </div>

                <div>
                  <p className="font-bold text-white">
                    Track Portfolio Intelligence
                  </p>

                  <p className="mt-1 text-sm leading-6 text-[#B8AA96]">
                    Monitor rarity signals, market momentum, value trends,
                    and portfolio growth over time.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CAPABILITY PANELS */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
              <div className="inline-flex rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-cyan-200">
                Intelligence
              </div>

              <h3 className="mt-4 text-xl font-black">
                Market Analytics
              </h3>

              <p className="mt-3 text-sm leading-7 text-[#B8AA96]">
                Monitor market movement, rarity signals, value confidence,
                and portfolio trends across your archive.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
              <div className="inline-flex rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-fuchsia-200">
                Automation
              </div>

              <h3 className="mt-4 text-xl font-black">
                Enrichment Engine
              </h3>

              <p className="mt-3 text-sm leading-7 text-[#B8AA96]">
                Automatically enrich records with metadata, artwork,
                pricing intelligence, and collection insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* RIGHT SIDE */}
      <section className="relative flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* MOBILE BRAND */}
          <div className="mb-10 lg:hidden">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C7A45D]/30 bg-[#C7A45D]/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-[#D8B86A]">
              Collector Intelligence
            </div>

            <h1 className="mt-6 text-4xl font-black leading-tight">
              Build Your Collection Intelligence Archive
            </h1>

            <p className="mt-4 text-[#B7AA96]">
              Portfolio analytics, market intelligence, and automated collector
              insights.
            </p>
          </div>

          {/* SIGNUP CARD */}
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-2xl">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-[#8E8170]">
                Create Account
              </p>

              <h2 className="mt-3 text-4xl font-black tracking-tight">
                Start Your Archive
              </h2>

              <p className="mt-4 text-sm leading-7 text-[#B7AA96]">
                Create your collector intelligence workspace and begin building
                a premium portfolio archive powered by analytics and automation.
              </p>
            </div>

            <form action={signup} className="mt-10 space-y-5">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8E8170]">
                  Email Address
                </label>

                <input
                  name="email"
                  type="email"
                  required
                  placeholder="collector@example.com"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white outline-none transition focus:border-[#C7A45D]/60 focus:bg-black/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8E8170]">
                  Password
                </label>

                <input
                  name="password"
                  type="password"
                  required
                  placeholder="Create a secure password"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white outline-none transition focus:border-[#C7A45D]/60 focus:bg-black/50"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-[#C7A45D] px-5 py-4 text-sm font-black text-black transition hover:bg-[#D8B86A]"
              >
                Create Collector Account
              </button>
            </form>

            <div className="mt-8 border-t border-white/10 pt-6 text-center">
              <p className="text-sm text-[#B7AA96]">
                Already have an account?
              </p>

              <Link
                href="/auth/login"
                className="mt-3 inline-flex rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-[#F4EFE6] transition hover:border-[#C7A45D]/40 hover:bg-white/[0.03]"
              >
                Sign In
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center text-xs tracking-[0.15em] text-[#6F665C]">
            COLLECTOR INTELLIGENCE • MARKET ANALYTICS • PORTFOLIO INTELLIGENCE
          </div>
        </div>
      </section>
    </main>
  );
}