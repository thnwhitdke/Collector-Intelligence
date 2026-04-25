import Link from "next/link";
import { getValueQueue, pullBatchDiscogsValues } from "../../actions/value-queue";

export default async function ValueQueuePage() {
  const queue = await getValueQueue();

  return (
    <main className="min-h-screen bg-[#15110c] px-6 py-8 text-stone-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 border-b border-amber-900/40 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-500">
              Collector Intelligence
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              Value Pull Queue
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-400">
              Pull Discogs marketplace value suggestions for records that have a
              Discogs release ID. This updates low, median, high, estimated
              value, source, and last-updated fields.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/collection"
              className="rounded-xl border border-stone-700 px-4 py-2 text-sm text-stone-200 hover:bg-stone-800"
            >
              ← Collection
            </Link>

            <form
              action={async () => {
                "use server";
                await pullBatchDiscogsValues(10);
              }}
            >
              <button
                type="submit"
                className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400"
              >
                Pull Next 10
              </button>
            </form>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-amber-900/40 bg-stone-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
              Queue Loaded
            </p>
            <p className="mt-2 text-3xl font-semibold">{queue.length}</p>
          </div>

          <div className="rounded-2xl border border-amber-900/40 bg-stone-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
              Batch Size
            </p>
            <p className="mt-2 text-3xl font-semibold">10</p>
          </div>

          <div className="rounded-2xl border border-amber-900/40 bg-stone-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
              Source
            </p>
            <p className="mt-2 text-3xl font-semibold">Discogs</p>
          </div>
        </section>

        <div className="overflow-hidden rounded-2xl border border-amber-900/40 bg-stone-950/70">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-stone-900 text-xs uppercase tracking-[0.2em] text-stone-400">
              <tr>
                <th className="px-5 py-4">Record</th>
                <th className="px-5 py-4">Format</th>
                <th className="px-5 py-4">Release ID</th>
                <th className="px-5 py-4">Estimated Value</th>
                <th className="px-5 py-4">Last Updated</th>
              </tr>
            </thead>

            <tbody>
              {queue.map((record) => (
                <tr
                  key={record.id}
                  className="border-t border-stone-800 hover:bg-stone-900/70"
                >
                  <td className="px-5 py-4">
                    <div className="font-medium text-stone-100">
                      {record.artist}
                    </div>
                    <div className="text-stone-400">{record.title}</div>
                  </td>

                  <td className="px-5 py-4 text-stone-300">
                    {record.format ?? "—"}
                  </td>

                  <td className="px-5 py-4 text-stone-300">
                    {record.discogs_release_id ?? "—"}
                  </td>

                  <td className="px-5 py-4 text-stone-300">
                    {record.estimated_value
                      ? `$${Number(record.estimated_value).toFixed(2)}`
                      : "Not pulled"}
                  </td>

                  <td className="px-5 py-4 text-stone-400">
                    {record.value_last_updated
                      ? new Date(record.value_last_updated).toLocaleDateString()
                      : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {queue.length === 0 ? (
            <div className="p-10 text-center text-stone-400">
              No value queue records found.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}