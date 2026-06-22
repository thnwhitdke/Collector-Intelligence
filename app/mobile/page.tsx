export default function MobileInstallPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
          <div className="mb-4 h-16 w-16 rounded-2xl bg-slate-900 ring-1 ring-yellow-400/40" />
          <h1 className="text-2xl font-bold">Install Collector Intelligence</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            On iPhone, open Collector Intelligence in Safari, tap the Share button,
            then choose <strong>Add to Home Screen</strong>.
          </p>
        </div>

        <ol className="space-y-3 text-sm text-slate-200">
          <li className="rounded-2xl bg-white/5 p-4">1. Open Safari on your iPhone.</li>
          <li className="rounded-2xl bg-white/5 p-4">2. Go to collectorsintelligence.com.</li>
          <li className="rounded-2xl bg-white/5 p-4">3. Tap the Share icon.</li>
          <li className="rounded-2xl bg-white/5 p-4">4. Tap Add to Home Screen.</li>
          <li className="rounded-2xl bg-white/5 p-4">5. Launch it from the new CI icon.</li>
        </ol>
      </div>
    </main>
  )
}
