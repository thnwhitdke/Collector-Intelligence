export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Privacy Policy</p>
          <h1 className="mt-4 text-4xl font-black">Privacy Policy</h1>
          <p className="mt-3 text-slate-400">Effective date: June 2026</p>
        </div>

        <section className="space-y-4 text-slate-300 leading-7">
          <p>
            Collector Intelligence respects user privacy. We collect only the information needed to provide collection
            management, valuation, rarity, market intelligence, account, and subscription features.
          </p>
          <h2 className="text-2xl font-black text-slate-100">Information We Collect</h2>
          <p>We may collect account information, collection data, usage activity, subscription status, and support messages.</p>

          <h2 className="text-2xl font-black text-slate-100">Collection Data</h2>
          <p>Your collection data is used to provide Collector Intelligence features. We do not sell user collection data.</p>

          <h2 className="text-2xl font-black text-slate-100">Payments</h2>
          <p>Payment information will be processed by Stripe. Collector Intelligence does not store full payment card numbers.</p>

          <h2 className="text-2xl font-black text-slate-100">Account Deletion</h2>
          <p>Users may request account deletion by contacting support@collectorsintelligence.com.</p>

          <h2 className="text-2xl font-black text-slate-100">Contact</h2>
          <p>Questions may be sent to support@collectorsintelligence.com.</p>
        </section>
      </div>
    </main>
  );
}
