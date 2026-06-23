export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Contact</p>
        <h1 className="mt-4 text-4xl font-black">Contact Collector Intelligence</h1>
        <p className="mt-4 text-lg text-slate-300">
          Questions, support requests, feature ideas, and business inquiries can be sent below.
        </p>

        <section className="mt-10 grid gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">Support</h2>
            <p className="mt-2 text-amber-300">support@collectorsintelligence.com</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">Feature Requests</h2>
            <p className="mt-2 text-amber-300">feedback@collectorsintelligence.com</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">Business Inquiries</h2>
            <p className="mt-2 text-amber-300">hello@collectorsintelligence.com</p>
          </div>
        </section>
      </div>
    </main>
  );
}
