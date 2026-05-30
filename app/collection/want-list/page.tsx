// app/collection/want-list/page.tsx

import Link from "next/link";
import CINavigation from "@/app/components/CINavigation";
import WantAlertFeed from "@/app/components/WantAlertFeed";
import {
  addDiscogsReleaseToWantList,
  deleteWantListItem,
  getWantList,
  markWantListItemPurchased,
  refreshWantListItem,
} from "../../actions/want-list";

function money(value: number | null | undefined) {
  if (!value || Number.isNaN(value)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

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

function demandScore(notes: string | null | undefined) {
  if (!notes) return null;

  const match = notes.match(
    /(\d+)\s+have\s+\/\s+(\d+)\s+want/i,
  );

  if (!match) return null;

  const have = Number(match[1]);
  const want = Number(match[2]);

  if (
    !Number.isFinite(have) ||
    !Number.isFinite(want)
  ) {
    return null;
  }

  return {
    have,
    want,
    ratio:
      have > 0
        ? want / have
        : want,
  };
}

function demandLabel(
  ratio: number | null | undefined,
) {
  if (
    ratio === null ||
    ratio === undefined
  ) {
    return "Unknown";
  }

  if (ratio >= 5) return "Fever Demand";
  if (ratio >= 2) return "High Demand";
  if (ratio >= 1) return "Balanced";

  return "Low Demand";
}

function rarityLabel(
  forSale: number | null | undefined,
) {
  if (
    forSale === null ||
    forSale === undefined
  ) {
    return "Unknown";
  }

  if (forSale <= 2) return "Ultra Rare";
  if (forSale <= 10) return "Scarce";
  if (forSale <= 25) return "Limited";

  return "Available";
}

function priorityClass(
  priority: string | null | undefined,
) {
  switch (priority) {
    case "High":
      return "border-red-500/30 bg-red-500/10 text-red-200";

    case "Low":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";

    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  }
}

export default async function WantListPage() {
  const items =
    await getWantList();

  const estimatedSpend =
    items.reduce(
      (sum, item) =>
        sum +
        (item.marketplace_lowest_price ??
          0),
      0,
    );

  const highPriority =
    items.filter(
      (i) =>
        i.priority === "High",
    ).length;

  return (
    <main className="min-h-screen bg-[#050403] text-[#F4EFE6]">
      <CINavigation />

      <section className="mx-auto max-w-7xl px-6 py-8">
        <section className="relative overflow-hidden rounded-[38px] border border-[#352819] bg-gradient-to-br from-[#16110B] via-[#0C0A07] to-[#050403] p-8 shadow-[0_18px_80px_rgba(0,0,0,.55)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(199,164,93,.12),transparent_35%)]" />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-[#D0B06C]">
                Collector Intelligence OS
              </p>

              <h1 className="mt-4 text-5xl font-black tracking-tight lg:text-6xl">
                Want Intelligence
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#B8AA96]">
                Premium acquisition intelligence powered by
                Discogs demand, rarity, and marketplace
                visibility.
              </p>
            </div>
          </div>
        </section>

        <WantAlertFeed />

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Metric
            label="Targets"
            value={String(
              items.length,
            )}
          />

          <Metric
            label="High Priority"
            value={String(
              highPriority,
            )}
          />

          <Metric
            label="Market Exposure"
            value={money(
              estimatedSpend,
            )}
            accent
          />
        </section>

        <section className="mt-8 rounded-[34px] border border-[#32281D] bg-[#0F0C09] p-6 shadow-2xl">
          <h2 className="text-3xl font-black">
            Add Want Target
          </h2>

          <form
            action={
              addDiscogsReleaseToWantList
            }
            className="mt-6 grid gap-3 lg:grid-cols-[1fr_180px_1fr_auto]"
          >
            <input
              name="discogs_release_id"
              required
              placeholder="Discogs release ID"
              className="rounded-3xl border border-[#3A3025] bg-[#090705] px-5 py-4"
            />

            <select
              name="priority"
              defaultValue="Medium"
              className="rounded-3xl border border-[#3A3025] bg-[#090705] px-5 py-4"
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>

            <input
              name="notes"
              placeholder="Acquisition notes"
              className="rounded-3xl border border-[#3A3025] bg-[#090705] px-5 py-4"
            />

            <button
              type="submit"
              className="rounded-3xl bg-[#C7A45D] px-6 py-4 font-black text-black"
            >
              Add Target
            </button>
          </form>
        </section>

        <section className="mt-10 grid gap-5">
          {items.map((item) => {
            const demand =
              demandScore(
                item.notes,
              );

            const internalRecordHref =
              item.record_id
                ? `/collection/${item.record_id}`
                : null;

            const discogsHref =
              item.discogs_url ??
              `https://www.discogs.com/release/${item.discogs_release_id}`;

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-[34px] border border-[#2D241B] bg-gradient-to-br from-[#120F0C] to-[#090705]"
              >
                <div className="grid gap-6 p-6 lg:grid-cols-[140px_1fr_250px]">
                  <div>
                    {item.cover_url ? (
                      <img
                        src={
                          item.cover_url
                        }
                        alt={
                          item.title ??
                          "Artwork"
                        }
                        className="aspect-square w-full rounded-3xl object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center rounded-3xl border border-dashed border-[#3A3025] text-xs text-[#7F7364]">
                        No Artwork
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap gap-2">
                      <div
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${priorityClass(
                          item.priority,
                        )}`}
                      >
                        {item.priority ??
                          "Medium"}{" "}
                        Priority
                      </div>

                      <div className="rounded-full border border-[#3A3025] bg-[#0D0A08] px-3 py-1 text-xs font-bold text-[#D8B65A]">
                        {rarityLabel(
                          item.marketplace_for_sale_count,
                        )}
                      </div>

                      <div className="rounded-full border border-[#3A3025] bg-[#0D0A08] px-3 py-1 text-xs font-bold text-[#D8B65A]">
                        {demandLabel(
                          demand?.ratio,
                        )}
                      </div>
                    </div>

                    <h2 className="mt-4 text-3xl font-black">
                      {item.title}
                    </h2>

                    <p className="mt-2 text-lg text-[#D8C39B]">
                      {item.artist}
                    </p>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <Info label="Label" value={item.label} />
                      <Info label="Format" value={item.format} />
                      <Info label="Year" value={item.year_released} />
                      <Info
                        label="Added"
                        value={compactDate(
                          item.created_at,
                        )}
                      />
                    </div>

                    <div className="mt-6 rounded-3xl border border-[#2E2418] bg-[#0B0907] p-5">
                      <div className="mt-5 grid gap-4 md:grid-cols-3">
                        <MetricMini
                          label="Lowest Price"
                          value={money(
                            item.marketplace_lowest_price,
                          )}
                        />

                        <MetricMini
                          label="For Sale"
                          value={String(
                            item.marketplace_for_sale_count ??
                              0,
                          )}
                        />

                        <MetricMini
                          label="Demand"
                          value={
                            demand
                              ? `${demand.want}/${demand.have}`
                              : "—"
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {internalRecordHref ? (
                      <Link
                        href={
                          internalRecordHref
                        }
                        className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-center text-sm font-bold text-cyan-100"
                      >
                        View CI Record
                      </Link>
                    ) : (
                      <a
                        href={
                          discogsHref
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border border-[#3A3025] bg-[#100D09] px-4 py-3 text-center text-sm font-bold text-[#D8B65A]"
                      >
                        External Intelligence
                      </a>
                    )}

                    <a
                      href={
                        discogsHref
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-[#4A3A1E] bg-[#15110C] px-4 py-3 text-center text-sm font-bold text-[#D8B65A]"
                    >
                      Discogs Release
                    </a>

                    {item.marketplace_url ? (
                      <a
                        href={
                          item.marketplace_url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border border-[#3A2C18] bg-[#100D09] px-4 py-3 text-center text-sm font-bold text-[#D7C49A]"
                      >
                        Marketplace
                      </a>
                    ) : null}

                    <form
                      action={
                        refreshWantListItem
                      }
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={item.id}
                      />

                      <input
                        type="hidden"
                        name="discogs_release_id"
                        value={
                          item.discogs_release_id
                        }
                      />

                      <button
                        type="submit"
                        className="w-full rounded-2xl border border-[#4A3A1E] bg-[#14100B] px-4 py-3 text-sm font-bold text-[#D8B65A]"
                      >
                        Refresh Intelligence
                      </button>
                    </form>

                    <form
                      action={
                        markWantListItemPurchased
                      }
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={item.id}
                      />

                      <button
                        type="submit"
                        className="w-full rounded-2xl border border-[#274427] bg-[#0E160E] px-4 py-3 text-sm font-bold text-[#9DE18C]"
                      >
                        Mark Purchased
                      </button>
                    </form>

                    <form
                      action={
                        deleteWantListItem
                      }
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={item.id}
                      />

                      <button
                        type="submit"
                        className="w-full rounded-2xl border border-[#4A2727] bg-[#170D0D] px-4 py-3 text-sm font-bold text-[#E1A08C]"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-[#2D241B] bg-[#100D09] p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-[#8E8170]">
        {label}
      </p>

      <p
        className={`mt-3 text-4xl font-black ${
          accent
            ? "text-[#D8B65A]"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MetricMini({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#231C13] bg-[#0F0C09] p-4">
      <p className="text-xs uppercase text-[#827463]">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black">
        {value}
      </p>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#847766]">
        {label}
      </p>

      <p className="mt-1 text-sm">
        {value ?? "—"}
      </p>
    </div>
  );
}