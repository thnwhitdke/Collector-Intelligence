"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../src/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
            Collector Intelligence
          </p>

          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
            Start with 15 records. Use every feature.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Create a free account and experience the full Collector Intelligence platform:
            collection search, value dashboard, rarity intelligence, market signals,
            daily briefings, and the mobile companion app.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              "All features included",
              "Free up to 15 records",
              "Upgrade only when your collection grows",
              "Built for serious collectors",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm font-bold text-slate-200"
              >
                ✓ {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/30">
          <div className="mb-6">
            <h2 className="text-2xl font-black">Create your account</h2>
            <p className="mt-2 text-sm text-slate-400">
              Free plan includes all features for up to 15 records.
            </p>
          </div>

          <form onSubmit={signUp} className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-300">Email</span>
              <input
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-amber-300"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                type="email"
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-300">Password</span>
              <input
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-amber-300"
                placeholder="Minimum 6 characters"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-xl bg-amber-300 px-5 py-3 font-black text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create free account"}
            </button>
          </form>

          {msg && (
            <p className="mt-4 rounded-xl border border-red-900/70 bg-red-950/40 p-3 text-sm text-red-200">
              {msg}
            </p>
          )}

          <div className="mt-6 space-y-3 text-sm text-slate-400">
            <p>
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-amber-300 hover:text-amber-200">
                Login
              </Link>
            </p>

            <p>
              By creating an account, you agree to the{" "}
              <Link href="/terms" className="text-amber-300 hover:text-amber-200">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-amber-300 hover:text-amber-200">
                Privacy Policy
              </Link>
              .
            </p>

            <p>
              Want to compare plans?{" "}
              <Link href="/pricing" className="text-amber-300 hover:text-amber-200">
                View pricing
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
