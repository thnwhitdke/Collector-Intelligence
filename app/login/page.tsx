"use client";

import { useState } from "react";
import { createClient } from "../../src/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ticker = [
  "LIVE MARKET SIGNALS",
  "AUTONOMOUS ENRICHMENT",
  "TRACK INTELLIGENCE",
  "COLLECTOR IQ",
  "PRESSING AI",
  "PORTFOLIO OS",
];

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
    <main className="relative flex min-h-screen overflow-hidden bg-[#050403] text-[#F4EFE6]">
      {/* BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[-12%] top-[-12%] h-[560px] w-[560px] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute right-[-12%] bottom-[-18%] h-[620px] w-[620px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.035]">
          <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:70px_70px]" />
        </div>
      </div>

      {/* LEFT */}
      <section className="relative hidden w-1/2 flex-col justify-between border-r border-white/10 p-16 lg:flex">
        <div>
          <div className="flex items-center gap-4">
            <img
              src="/icon.svg"
              alt="Collector Intelligence"
              className="h-14 w-14 rounded-2xl"
            />

            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-[#D8B86A]">
                Collector Intelligence
              </p>

              <h1 className="mt-1 text-xl font-black">
                Intelligence OS
              </h1>
            </div>
          </div>

          <div className="mt-12 inline-flex rounded-full border border-[#C7A45D]/20 bg-[#C7A45D]/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-[#D8B86A]">
            Private Collector Intelligence Layer
          </div>

          <h2 className="mt-8 max-w-xl text-6xl font-black leading-[1.02] tracking-tight">
            Access
            <br />
            Your
            <br />
            Intelligence
            <br />
            Layer.
          </h2>

          <p className="mt-8 max-w-xl text-lg leading-8 text-[#B7AA96]">
            Portfolio analytics, rarity intelligence, enrichment systems,
            track metadata, market behavior, and collector-grade signals
            from one command surface.
          </p>
        </div>

        {/* TICKER */}
        <div className="overflow-hidden rounded-3xl border border-[#D8B65A]/10 bg-[#D8B65A]/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#D8B86A]">
              Live Intelligence Feed
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {ticker.map((item) => (
              <div
                key={item}
                className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#CFC6B8]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* MOCKUP */}
        <div className="mt-8 rounded-[34px] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#8E8170]">
                Portfolio Intelligence
              </p>

              <h3 className="mt-2 text-4xl font-black">
                $128,450
              </h3>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-200">
              +12.8%
            </div>
          </div>

          <div className="mt-7 h-36 rounded-3xl border border-white/10 bg-black/25 p-4">
            <div className="flex h-full items-end gap-3">
              <div className="h-[28%] w-full rounded-t-xl bg-white/10" />
              <div className="h-[36%] w-full rounded-t-xl bg-white/10" />
              <div className="h-[48%] w-full rounded-t-xl bg-white/10" />
              <div className="h-[42%] w-full rounded-t-xl bg-white/10" />
              <div className="h-[65%] w-full rounded-t-xl bg-cyan-400/45" />
              <div className="h-[82%] w-full rounded-t-xl bg-fuchsia-400/45" />
              <div className="h-[95%] w-full rounded-t-xl bg-[#C7A45D]" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <Mini label="Records" value="4,218" />
            <Mini label="Signals" value="42" accent="text-fuchsia-100" />
            <Mini label="Rare" value="18" accent="text-cyan-100" />
          </div>
        </div>
      </section>

      {/* RIGHT */}
      <section className="relative flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-0 rounded-[40px] bg-[#C7A45D]/10 blur-3xl" />

          <div className="relative rounded-[38px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <img
                src="/icon.svg"
                alt="CI"
                className="h-11 w-11 rounded-xl"
              />

              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#8E8170]">
                  Collector Intelligence
                </p>

                <h2 className="text-3xl font-black">
                  Welcome Back
                </h2>
              </div>
            </div>

            <p className="mt-5 leading-7 text-[#B7AA96]">
              Launch your intelligence workspace and access portfolio
              analytics, enrichment systems, and live collector signals.
            </p>

            <form onSubmit={signIn} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-[#8E8170]">
                  Email
                </label>

                <input
                  type="email"
                  placeholder="collector@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm outline-none transition focus:border-[#C7A45D]/60"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-[#8E8170]">
                  Password
                </label>

                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm outline-none transition focus:border-[#C7A45D]/60"
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
                className="w-full rounded-2xl bg-[#C7A45D] px-5 py-4 text-sm font-black text-black transition hover:bg-[#D8B86A] disabled:opacity-60"
              >
                {loading
                  ? "Launching..."
                  : "Launch Intelligence OS"}
              </button>
            </form>

            <div className="mt-7 border-t border-white/10 pt-6 text-center">
              <p className="text-sm text-[#B7AA96]">
                New to Collector Intelligence?
              </p>

              <Link
                href="/signup"
                className="mt-3 inline-flex rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold transition hover:border-[#C7A45D]/40 hover:bg-white/[0.03]"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
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
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-[10px] uppercase tracking-[0.15em] text-[#8E8170]">
        {label}
      </p>

      <p className={`mt-2 text-lg font-black ${accent}`}>
        {value}
      </p>
    </div>
  );
}
