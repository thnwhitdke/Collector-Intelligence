import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

const FREE_LIMIT = 15;

function planLabel(tier?: string | null) {
  if (tier === "collector") return "Collector";
  if (tier === "founder") return "Founder";
  if (tier === "lifetime") return "Lifetime";
  if (tier === "internal") return "Internal";
  return "Free";
}

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  const { count } = await supabase
    .from("records_clean_safe")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const tier = profile?.subscription_tier ?? "free";
  const status = profile?.subscription_status ?? "active";
  const used = count ?? 0;
  const isFree = tier === "free";
  const remaining = Math.max(0, FREE_LIMIT - used);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
          Account
        </p>

        <h1 className="mt-4 text-4xl font-black">Your Collector Intelligence plan</h1>

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-bold uppercase text-slate-400">Plan</p>
            <p className="mt-3 text-3xl font-black text-amber-300">{planLabel(tier)}</p>
            <p className="mt-2 text-sm text-slate-400">Status: {status}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-bold uppercase text-slate-400">Records</p>
            <p className="mt-3 text-3xl font-black">{used}</p>
            <p className="mt-2 text-sm text-slate-400">
              {isFree ? `${remaining} remaining on Free` : "Unlimited records"}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-bold uppercase text-slate-400">Features</p>
            <p className="mt-3 text-3xl font-black">All</p>
            <p className="mt-2 text-sm text-slate-400">
              {isFree ? "All features included up to 15 records" : "Full platform access"}
            </p>
          </div>
        </section>

        {isFree && (
          <section className="mt-8 rounded-3xl border border-amber-300/30 bg-amber-300/10 p-6">
            <h2 className="text-2xl font-black text-amber-300">Free plan</h2>
            <p className="mt-3 max-w-3xl text-slate-300">
              Your Free plan includes every Collector Intelligence feature for up to 15 records.
              Upgrade to Collector when you want unlimited records.
            </p>
            <Link
              href="/pricing"
              className="mt-5 inline-flex rounded-xl bg-amber-300 px-5 py-3 font-black text-slate-950"
            >
              View Upgrade Options
            </Link>
          </section>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/collection" className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-200 hover:border-amber-300">
            Go to Collection
          </Link>
          <Link href="/pricing" className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-200 hover:border-amber-300">
            Pricing
          </Link>
          <Link href="/contact" className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-200 hover:border-amber-300">
            Contact Support
          </Link>
        </div>
      </div>
    </main>
  );
}
