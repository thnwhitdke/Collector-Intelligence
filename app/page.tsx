import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Collector Intelligence
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
            Manage your record collection, review missing covers, improve
            metadata quality, and prepare new imports.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/collection"
              className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-85"
            >
              Open Collection
            </Link>

            <Link
              href="/import"
              className="rounded-2xl border border-neutral-300 bg-white px-5 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
            >
              Import Records
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}