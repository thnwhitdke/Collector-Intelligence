import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    detail: "Try Collector Intelligence with up to 15 records.",
    features: ["Up to 15 records", "Collection search", "Basic record intelligence", "Basic dashboard"],
    cta: "Start Free",
    href: "/signup",
  },
  {
    name: "Collector",
    price: "$4.99/mo",
    detail: "Unlimited collection intelligence for individual collectors.",
    features: ["Unlimited records", "Portfolio analytics", "Market intelligence", "Rarity engine", "Daily briefings", "Mobile companion app"],
    cta: "Upgrade Coming Soon",
    href: "/signup",
  },
  {
    name: "Founder",
    price: "$49/yr",
    detail: "Early supporter annual plan.",
    features: ["Everything in Collector", "Founder pricing", "Early access features", "Priority feedback"],
    cta: "Founder Plan Coming Soon",
    href: "/contact",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Pricing</p>
        <h1 className="mt-4 text-4xl font-black">Start free. Upgrade when your collection grows.</h1>
        <p className="mt-4 max-w-3xl text-lg text-slate-300">
          The free plan lets collectors experience the platform with up to 15 records.
          Paid plans unlock the full Collector Intelligence experience.
        </p>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-2xl font-black">{plan.name}</h2>
              <p className="mt-3 text-4xl font-black text-amber-300">{plan.price}</p>
              <p className="mt-3 min-h-16 text-slate-300">{plan.detail}</p>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                {plan.features.map((feature) => (
                  <li key={feature}>✓ {feature}</li>
                ))}
              </ul>
              <Link href={plan.href} className="mt-8 inline-flex w-full justify-center rounded-xl bg-amber-300 px-5 py-3 font-black text-slate-950">
                {plan.cta}
              </Link>
            </div>
          ))}
        </section>

        <p className="mt-8 text-sm text-slate-500">
          Payment processing will be handled by Stripe. Subscriptions can be canceled at any time once billing is enabled.
        </p>
      </div>
    </main>
  );
}
