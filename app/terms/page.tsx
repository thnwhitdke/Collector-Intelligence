export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Terms of Service</p>
          <h1 className="mt-4 text-4xl font-black">Terms of Service</h1>
          <p className="mt-3 text-slate-400">Effective date: June 2026</p>
        </div>

        <section className="space-y-4 text-slate-300 leading-7">
          <p>
            Collector Intelligence provides collection management, valuation, rarity, and market intelligence tools.
            By using the service, you agree to these terms.
          </p>

          <h2 className="text-2xl font-black text-slate-100">Valuation Disclaimer</h2>
          <p>
            Values, rarity labels, market signals, and analytics are estimates for informational purposes only.
            They are not financial, investment, insurance, appraisal, or tax advice.
          </p>

          <h2 className="text-2xl font-black text-slate-100">User Responsibility</h2>
          <p>Users are responsible for verifying collection details, condition, pressing information, and market value before relying on any data.</p>

          <h2 className="text-2xl font-black text-slate-100">Subscriptions</h2>
          <p>Paid subscriptions will renew automatically until canceled. Billing will be handled by Stripe once enabled.</p>

          <h2 className="text-2xl font-black text-slate-100">Acceptable Use</h2>
          <p>Users may not misuse the service, attempt unauthorized access, scrape data at scale, or interfere with platform operation.</p>

          <h2 className="text-2xl font-black text-slate-100">Contact</h2>
          <p>Questions may be sent to support@collectorsintelligence.com.</p>
        </section>
      </div>
    </main>
  );
}
