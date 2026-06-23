import Link from "next/link";
import { login } from "./actions";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#050403] text-[#F4EFE6]">
      <div className="absolute inset-0">
        <div className="absolute left-[-12%] top-[-12%] h-[560px] w-[560px] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute right-[-10%] bottom-[-18%] h-[620px] w-[620px] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <section className="relative hidden w-1/2 flex-col justify-between border-r border-white/10 p-16 lg:flex">
        <div>
          <div className="flex items-center gap-4">
            <img src="/icon.svg" alt="Collector Intelligence" className="h-14 w-14 rounded-2xl" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-[#D8B86A]">
                Collector Intelligence
              </p>
              <h1 className="text-xl font-black">Intelligence OS</h1>
            </div>
          </div>

          <h2 className="mt-14 max-w-xl text-6xl font-black leading-[1.02]">
            Welcome back to your collector intelligence layer.
          </h2>

          <p className="mt-8 max-w-xl text-lg leading-8 text-[#B7AA96]">
            Access collection search, value dashboards, rarity intelligence,
            market signals, scanner tools, and daily collector briefings.
          </p>
        </div>

        <div className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#D8B86A]">
            System Status
          </p>
          <p className="mt-3 text-3xl font-black">Intelligence Engine Active</p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Mini label="Portfolio" value="Live" />
            <Mini label="Signals" value="Active" />
            <Mini label="Engine" value="Online" />
          </div>
        </div>
      </section>

      <section className="relative flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-0 rounded-[40px] bg-[#C7A45D]/10 blur-3xl" />

          <div className="relative rounded-[38px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <img src="/icon.svg" alt="CI" className="h-11 w-11 rounded-xl" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#8E8170]">
                  Secure Access
                </p>
                <h2 className="text-3xl font-black">Sign In</h2>
              </div>
            </div>

            <p className="mt-5 leading-7 text-[#B7AA96]">
              Launch your private Collector Intelligence workspace. Free accounts include every feature for up to 15 records.
            </p>

            <form action={login} className="mt-8 space-y-5">
              <input
                name="email"
                type="email"
                required
                placeholder="Email"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm outline-none focus:border-[#C7A45D]/60"
              />

              <input
                name="password"
                type="password"
                required
                placeholder="Password"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm outline-none focus:border-[#C7A45D]/60"
              />

              <button
                type="submit"
                className="w-full rounded-2xl bg-[#C7A45D] px-5 py-4 text-sm font-black text-black transition hover:bg-[#D8B86A]"
              >
                Launch Intelligence OS
              </button>
            </form>

            <div className="mt-7 border-t border-white/10 pt-6 text-center">
              <p className="text-sm text-[#B7AA96]">New to Collector Intelligence?</p>
              <Link
                href="/signup"
                className="mt-3 inline-flex rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold transition hover:border-[#C7A45D]/40 hover:bg-white/[0.03]"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-[10px] uppercase tracking-[0.15em] text-[#8E8170]">
        {label}
      </p>
      <p className="mt-2 text-lg font-black">{value}</p>
    </div>
  );
}
