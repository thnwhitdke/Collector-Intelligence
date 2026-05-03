import Link from "next/link";
import {
  addDiscogsReleaseToWantList,
  deleteWantListItem,
  getWantList,
  markWantListItemPurchased,
  refreshWantListItem,
} from "../../actions/want-list";

function compactDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDemandScore(notes: string | null | undefined) {
  if (!notes) return null;

  const match = notes.match(/(\d+)\s+have\s+\/\s+(\d+)\s+want/i);
  if (!match) return null;

  const have = Number(match[1]);
  const want = Number(match[2]);

  if (!Number.isFinite(have) || !Number.isFinite(want)) return null;

  return {
    have,
    want,
    ratio: have > 0 ? want / have : want,
  };
}

function demandLabel(ratio: number | null | undefined) {
  if (ratio === null || ratio === undefined) return "Demand unknown";
  if (ratio >= 5) return "Very high demand";
  if (ratio >= 2) return "Strong demand";
  if (ratio >= 1) return "Balanced demand";
  return "Low demand";
}

export default async function WantListPage() {
  const items = await getWantList();

  const highPriorityCount = items.filter(
    (item) => item.priority === "High"
  ).length;

  const demandItems = items
    .map((item) => getDemandScore(item.notes))
    .filter(Boolean);

  const averageDemandRatio =
    demandItems.length > 0
      ? demandItems.reduce((sum, item) => sum + (item?.ratio ?? 0), 0) /
        demandItems.length
      : null;

  return (
    <main className="min-h-screen bg-[#080604] px-5 py-8 text-[#F4EFE6]">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#C7A85B]">
              Collector Intelligence
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight">
              Want List
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#B8AA96]">
              Track wanted Discogs releases separately from your owned
              collection. This view focuses on priority, community demand, and
              release intelligence.
            </p>
          </div>

          <Link
            href="/collection"
            className="rounded-2xl border border-[#4A3A1E] px-5 py-3 text-sm font-bold text-[#D8B65A] hover:bg-[#1E170E]"
          >
            Back to Collection
          </Link>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-[#2F2619] bg-[#120F0A] p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8E8170]">
              Wanted Items
            </p>
            <p className="mt-3 text-3xl font-black">{items.length}</p>
          </div>

          <div className="rounded-3xl border border-[#2F2619] bg-[#120F0A] p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8E8170]">
              High Priority
            </p>
            <p className="mt-3 text-3xl font-black">{highPriorityCount}</p>
          </div>

          <div className="rounded-3xl border border-[#2F2619] bg-[#120F0A] p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8E8170]">
              Demand Signal
            </p>
            <p className="mt-3 text-2xl font-black">
              {demandLabel(averageDemandRatio)}
            </p>
          </div>
        </section>

        <section className="mb-8 rounded-3xl border border-[#3A2D18] bg-[#11100D] p-5 shadow-2xl">
          <h2 className="text-xl font-black">Add Discogs Release</h2>

          <p className="mt-2 text-sm leading-6 text-[#B8AA96]">
            Use the Discogs release number from a URL like
            discogs.com/release/1234567.
          </p>

          <form
            action={addDiscogsReleaseToWantList}
            className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_1fr_auto]"
          >
            <input
              name="discogs_release_id"
              required
              placeholder="Discogs release ID"
              className="rounded-2xl border border-[#3A3328] bg-[#070604] px-4 py-3 text-sm font-semibold text-[#F4EFE6] outline-none placeholder:text-[#6F6559]"
            />

            <select
              name="priority"
              defaultValue="Medium"
              className="rounded-2xl border border-[#3A3328] bg-[#070604] px-4 py-3 text-sm font-semibold text-[#F4EFE6] outline-none"
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>

            <input
              name="notes"
              placeholder="Optional note"
              className="rounded-2xl border border-[#3A3328] bg-[#070604] px-4 py-3 text-sm font-semibold text-[#F4EFE6] outline-none placeholder:text-[#6F6559]"
            />

            <button
              type="submit"
              className="rounded-2xl bg-[#D8B65A] px-6 py-3 text-sm font-black text-[#0A0704] hover:bg-[#E7C76B]"
            >
              Add to Want List
            </button>
          </form>
        </section>

        <section className="grid gap-4">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-[#2F2619] bg-[#120F0A] p-8 text-center">
              <h2 className="text-2xl font-black">No wanted records yet</h2>
              <p className="mt-2 text-sm text-[#B8AA96]">
                Add a Discogs release ID above to start tracking wanted items.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const demand = getDemandScore(item.notes);
              const demandText = demand
                ? `${demand.want} want / ${demand.have} have`
                : "Demand unknown";

              return (
                <article
                  key={item.id}
                  className="grid gap-5 rounded-3xl border border-[#2F2619] bg-[#120F0A] p-5 shadow-2xl md:grid-cols-[110px_1fr_auto]"
                >
                  <div className="h-[110px] w-[110px] overflow-hidden rounded-2xl border border-[#3A3328] bg-[#070604]">
                    {item.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.cover_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#6F6559]">
                        No Cover
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#221B10] px-3 py-1 text-xs font-bold text-[#D8B65A]">
                        {item.priority || "Medium"} priority
                      </span>

                      <span className="rounded-full bg-[#1D2114] px-3 py-1 text-xs font-bold text-[#BFD88B]">
                        {demandLabel(demand?.ratio)}
                      </span>
                    </div>

                    <h2 className="mt-3 text-2xl font-black leading-tight">
                      {item.title || "Untitled Release"}
                    </h2>

                    <p className="mt-1 text-sm font-semibold text-[#C9BEAF]">
                      {item.artist || "Unknown Artist"}
                    </p>

                    <p className="mt-2 text-sm text-[#8E8170]">
                      {item.label || "Unknown Label"}
                      {item.year_released ? ` • ${item.year_released}` : ""}
                      {item.format ? ` • ${item.format}` : ""}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-[#302719] bg-[#080604] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E8170]">
                          Demand
                        </p>
                        <p className="mt-1 font-black text-[#D8B65A]">
                          {demandText}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[#302719] bg-[#080604] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E8170]">
                          Release ID
                        </p>
                        <p className="mt-1 font-black">
                          {item.discogs_release_id}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[#302719] bg-[#080604] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E8170]">
                          Updated
                        </p>
                        <p className="mt-1 font-black">
                          {compactDate(item.updated_at)}
                        </p>
                      </div>
                    </div>

                    {item.notes ? (
                      <p className="mt-4 text-sm leading-6 text-[#B8AA96]">
                        {item.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 md:min-w-[170px]">
                    {item.discogs_url ? (
                      <a
                        href={item.discogs_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border border-[#4A3A1E] px-4 py-3 text-center text-sm font-bold text-[#D8B65A] hover:bg-[#1E170E]"
                      >
                        Discogs Page
                      </a>
                    ) : null}

                    <form action={refreshWantListItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <input
                        type="hidden"
                        name="discogs_release_id"
                        value={item.discogs_release_id}
                      />
                      <button
                        type="submit"
                        className="w-full rounded-2xl border border-[#4A3A1E] px-4 py-3 text-sm font-bold text-[#D8B65A] hover:bg-[#1E170E]"
                      >
                        Refresh
                      </button>
                    </form>

                    <form action={markWantListItemPurchased}>
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        type="submit"
                        className="w-full rounded-2xl border border-[#274427] px-4 py-3 text-sm font-bold text-[#9DE18C] hover:bg-[#102010]"
                      >
                        Mark Purchased
                      </button>
                    </form>

                    <form action={deleteWantListItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        type="submit"
                        className="w-full rounded-2xl border border-[#4A2727] px-4 py-3 text-sm font-bold text-[#E1A08C] hover:bg-[#201010]"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </section>
    </main>
  );
}
