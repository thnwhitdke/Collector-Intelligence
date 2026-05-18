"use client";

import { useState } from "react";
import { createClient } from "../../src/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }

    router.push("/collection");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#0B0B0A] text-[#F4EFE6]">
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
            Collection
            <br />
            Intelligence
            <br />
            Reimagined
          </h1>

          <p className="mt-8 max-w-lg text-lg leading-8 text-[#B7AA96]">
            Market analytics, portfolio intelligence, automated enrichment,
            rarity detection, and momentum tracking for serious collectors.
          </p>
        </div>

        <div className="grid gap-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#8E8170]">
                  Portfolio Intelligence
                </p>

                <p className="mt-2 text-3xl font-black">$128,450</p>
              </div>

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                +12.8%
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#8E8170]">
                  Records
                </p>

                <p className="mt-2 text-lg font-bold">4,218</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#8E8170]">
                  Movers
                </p>

                <p className="mt-2 text-lg font-bold text-fuchsia-200">
                  42
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#8E8170]">
                  Rare
                </p>

                <p className="mt-2 text-lg font-bold text-cyan-200">18</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#8E8170]">
                  Market Momentum
                </p>

                <p className="mt-2 text-2xl font-black text-fuchsia-100">
                  Strong Uptrend
                </p>
              </div>

              <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(74,222,128,0.8)]" />
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <span className="text-sm text-[#B8AA96]">
                  Records Updated
                </span>

                <span className="font-bold">217 Today</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <span className="text-sm text-[#B8AA96]">
                  Value Signals
                </span>

                <span className="font-bold text-cyan-100">
                  9 New Alerts
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <span className="text-sm text-[#B8AA96]">
                  Sync Status
                </span>

                <span className="font-bold text-emerald-200">
                  Live
                </span>
              </div>
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
              Collection Intelligence Reimagined
            </h1>

            <p className="mt-4 text-[#B7AA96]">
              Portfolio analytics, market intelligence, and automated collector
              insights.
            </p>
          </div>

          {/* LOGIN CARD */}
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-2xl">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-[#8E8170]">
                Welcome Back
              </p>

              <h2 className="mt-3 text-4xl font-black tracking-tight">
                Sign In
              </h2>

              <p className="mt-4 text-sm leading-7 text-[#B7AA96]">
                Access your collector portfolio, market analytics, enrichment
                systems, and intelligence dashboards.
              </p>
            </div>

            <form onSubmit={signIn} className="mt-10 space-y-5">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8E8170]">
                  Email Address
                </label>

                <input
                  type="email"
                  placeholder="collector@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white outline-none transition focus:border-[#C7A45D]/60 focus:bg-black/50"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8E8170]">
                  Password
                </label>

                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white outline-none transition focus:border-[#C7A45D]/60 focus:bg-black/50"
                  required
                />
              </div>

              {msg ? (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {msg}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[#C7A45D] px-5 py-4 text-sm font-bold text-black transition hover:bg-[#D8B86A] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing In..." : "Enter Collector Intelligence"}
              </button>
            </form>

            <div className="mt-8 border-t border-white/10 pt-6 text-center">
              <p className="text-sm text-[#B7AA96]">
                New to Collector Intelligence?
              </p>

              <Link
                href="/signup"
                className="mt-3 inline-flex rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-[#F4EFE6] transition hover:border-[#C7A45D]/40 hover:bg-white/[0.03]"
              >
                Create Account
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