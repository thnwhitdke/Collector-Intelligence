import UpgradeButtons from "./UpgradeButtons";
import Link from "next/link";

export default function UpgradePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
          Upgrade
        </p>

        <h1 className="mt-4 max-w-3xl text-4xl font-black md:text-6xl">
          You’ve reached the Free plan record limit.
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
          The Free plan includes every Collector Intelligence feature for up to 15 records.
          Upgrade to Collector when you are ready to unlock unlimited records.
        </p>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-black">Free</h2>
            <p className="mt-3 text-4xl font-black">$0</p>
            <p className="mt-3 text-slate-300">All features. Up to 15 records.</p>
          </div>

          <div className="rounded-3xl border border-amber-300/40 bg-amber-300/10 p-6">
            <h2 className="text-2xl font-black text-amber-300">Collector</h2>
            <p className="mt-3 text-4xl font-black">$4.99/mo</p>
            <p className="mt-3 text-slate-300">Everything included. Unlimited records.</p>
            <UpgradeButtons />
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/account" className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-200 hover:border-amber-300">
            Account
          </Link>
          <Link href="/contact" className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-200 hover:border-amber-300">
            Contact Support
          </Link>
        </div>
      </div>
    </main>
  );
}
