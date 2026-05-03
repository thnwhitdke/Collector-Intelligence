import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getValueQueue,
  getMissingCoverQueue,
  pullBatchDiscogsValues,
  pullBatchMissingCovers,
  type ValueQueueRecord,
  type MissingCoverRecord,
} from "../../actions/value-queue";

type ValueQueuePageProps = {
  searchParams?: Promise<{
    pulled?: string;
    covers?: string;
  }>;
};

function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "—";
  }

  const numeric = Number(String(value).replace(/[$,]/g, ""));

  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Never";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function priorityLabel(priority: number) {
  if (priority === 1) return "Purchase / No Value";
  if (priority === 2) return "Missing Discogs";
  if (priority === 3) return "Missing Estimate";
  if (priority === 4) return "Never Updated";
  if (priority === 50) return "Discogs Error";
  if (priority === 98) return "Missing Release ID";
  if (priority === 99) return "Unavailable";
  return "Routine Refresh";
}

function priorityTone(priority: number) {
  if (priority === 1) {
    return "border-red-400/40 bg-red-400/10 text-red-100";
  }

  if (priority === 2 || priority === 3) {
    return "border-orange-300/40 bg-orange-300/10 text-orange-100";
  }

  if (priority === 4 || priority === 50) {
    return "border-yellow-300/40 bg-yellow-300/10 text-yellow-100";
  }

  return "border-[#3A3328] bg-[#17130F] text-[#D8CBB8]";
}

function statusLabel(status: string | null | undefined) {
  if (!status) return "Needs Pull";

  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusTone(status: string | null | undefined) {
  if (status === "pulled_successfully") {
    return "border-[#7FA36B]/45 bg-[#7FA36B]/15 text-[#F4EFE6]";
  }

  if (status === "discogs_error") {
    return "border-red-400/40 bg-red-400/10 text-red-100";
  }

  if (status === "no_discogs_value_available") {
    return "border-[#8E8170]/40 bg-[#8E8170]/10 text-[#D8CBB8]";
  }

  return "border-[#C7A45D]/45 bg-[#C7A45D]/15 text-[#F4EFE6]";
}

function buildReturnPath(showPullNotice: boolean, showCoverNotice: boolean) {
  if (showPullNotice) return "/collection/value-queue?pulled=1";
  if (showCoverNotice) return "/collection/value-queue?covers=1";
  return "/collection/value-queue";
}

export default async function ValueQueuePage({
  searchParams,
}: ValueQueuePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const showPullNotice = resolvedSearchParams.pulled === "1";
  const showCoverNotice = resolvedSearchParams.covers === "1";
  const returnPath = buildReturnPath(showPullNotice, showCoverNotice);

  async function pullNextTenAction() {
    "use server";

    await pullBatchDiscogsValues(10);
    redirect("/collection/value-queue?pulled=1");
  }

  async function pullMissingCoversAction() {
    "use server";

    await pullBatchMissingCovers(10);
    redirect("/collection/value-queue?covers=1");
  }

let queue: ValueQueueRecord[] = [];
let missingCoverQueue: MissingCoverRecord[] = [];
let loadError: string | null = null;

  try {
    queue = await getValueQueue();
    missingCoverQueue = await getMissingCoverQueue(5000);
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Unknown error while loading value queue.";
  }

  const missingDiscogsCount = queue.filter(
    (record) =>
      !record.discogs_median_price ||
      Number(String(record.discogs_median_price).replace(/[$,]/g, "")) <= 0,
  ).length;

  const missingEstimateCount = queue.filter(
    (record) =>
      !record.estimated_value ||
      Number(String(record.estimated_value).replace(/[$,]/g, "")) <= 0,
  ).length;

 const missingCoverCount = missingCoverQueue.length;

  const errorCount = queue.filter(
    (record) => record.value_pull_status === "discogs_error",
  ).length;

  const totalQueueValue = queue.reduce((sum, record) => {
    const numeric = Number(
      String(record.estimated_value ?? 0).replace(/[$,]/g, ""),
    );
    return sum + (Number.isFinite(numeric) ? numeric : 0);
  }, 0);

  return (
    <main className="min-h-screen bg-[#0E0C0A] px-6 py-8 text-[#F4EFE6]">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[34px] border border-[#3A3328] bg-[radial-gradient(circle_at_top_left,_rgba(199,164,93,0.16),_transparent_32%),linear-gradient(135deg,_#0E0C0A,_#17130F_58%,_#272017)] p-6 shadow-2xl shadow-black/40">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-[#8F6F35]/45 bg-[#C7A45D]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C7A45D]">
                Discogs Value Pull Queue
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Records Ready for Value Intelligence
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#B8AA96]">
                This queue is connected directly to the Discogs value pull
                action. It prioritizes records with a Discogs release ID that
                need estimated value, median price support, refreshed value
                timestamps, or missing cover recovery.
              </p>

              {showPullNotice && (
                <p className="mt-4 rounded-2xl border border-[#7FA36B]/35 bg-[#7FA36B]/12 px-4 py-3 text-sm font-semibold text-[#BDE0A8]">
                  Pull Next 10 completed. The queue has been refreshed.
                </p>
              )}

              {showCoverNotice && (
                <p className="mt-4 rounded-2xl border border-[#7FA36B]/35 bg-[#7FA36B]/12 px-4 py-3 text-sm font-semibold text-[#BDE0A8]">
                  Missing cover batch pull completed. The queue has been
                  refreshed.
                </p>
              )}

              {loadError && (
                <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                  Supabase warning: {loadError}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/collection"
                className="rounded-2xl border border-[#8F6F35]/50 bg-[#C7A45D]/10 px-5 py-3 text-sm font-semibold text-[#F4EFE6] transition hover:bg-[#C7A45D]/18"
              >
                Back to Collection
              </Link>

              <Link
                href="/collection/value-dashboard"
                className="rounded-2xl border border-[#8F6F35]/50 bg-[#C7A45D]/10 px-5 py-3 text-sm font-semibold text-[#F4EFE6] transition hover:bg-[#C7A45D]/18"
              >
                Value Dashboard
              </Link>

              <form action={pullMissingCoversAction}>
                <button
                  type="submit"
                  className="rounded-2xl border border-[#C7A45D]/60 bg-[#17130F] px-5 py-3 text-sm font-semibold text-[#F4EFE6] transition hover:bg-[#C7A45D]/18"
                >
                  Pull Missing Covers
                </button>
              </form>

              <form action={pullNextTenAction}>
                <button
                  type="submit"
                  className="rounded-2xl bg-gradient-to-r from-[#C7A45D] to-[#8F6F35] px-5 py-3 text-sm font-semibold text-[#11100E] transition hover:opacity-90"
                >
                  Pull Next 10
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <QueueMetric
            label="Queue Records"
            value={formatNumber(queue.length)}
            helper="Records currently eligible for value pull."
          />

          <QueueMetric
            label="Missing Discogs"
            value={formatNumber(missingDiscogsCount)}
            helper="Records without Discogs median support."
          />

          <QueueMetric
            label="Missing Estimate"
            value={formatNumber(missingEstimateCount)}
            helper="Records without a usable estimated value."
          />

          <QueueMetric
            label="Missing Covers"
            value={formatNumber(missingCoverCount)}
            helper="Records with Discogs IDs but no cover image."
          />

          <QueueMetric
            label="Queue Value"
            value={formatMoney(totalQueueValue)}
            helper="Current estimated value represented in queue."
          />
        </section>

        <section className="rounded-[28px] border border-[#3A3328] bg-[linear-gradient(180deg,_rgba(26,24,21,0.96),_rgba(17,16,14,0.94))] p-5 shadow-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.32em] text-[#B8AA96]">
                Corrected Queue Logic
              </div>

              <p className="mt-2 text-sm leading-6 text-[#D8CBB8]">
                This page uses the same server actions that pull Discogs values
                and Discogs cover images, so the page and buttons work from the
                same logic.
              </p>
            </div>

            <div className="rounded-2xl border border-[#C7A45D]/35 bg-[#C7A45D]/10 px-4 py-3 text-sm font-semibold text-[#F4EFE6]">
              Single source of truth
            </div>
          </div>
        </section>

        {queue.length === 0 ? (
          <section className="rounded-[32px] border border-[#3A3328] bg-gradient-to-br from-[#0E0C0A] via-[#221F1A] to-[#0E0C0A] p-10 text-center shadow-2xl shadow-black/30">
            <div className="mx-auto max-w-xl">
              <div className="inline-flex rounded-full border border-[#7FA36B]/45 bg-[#7FA36B]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[#BDE0A8]">
                Queue Clear
              </div>

              <h2 className="mt-5 text-2xl font-semibold tracking-tight">
                No records are currently waiting for Discogs value pull
              </h2>

              <p className="mt-3 text-sm leading-7 text-[#D8CBB8]">
                Either the visible records already have value data, or no
                eligible Discogs release IDs are currently available.
              </p>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            {queue.map((record) => {
              const recordHref =
                record.id !== null && record.id !== undefined
                  ? `/collection/${record.id}?returnTo=${encodeURIComponent(
                      returnPath,
                    )}`
                  : returnPath;

              return (
                <article
                  key={String(record.id)}
                  className="overflow-hidden rounded-[30px] border border-[#3A3328] bg-[linear-gradient(145deg,_#282218,_#0E0C0A_48%,_#1B1712)] shadow-2xl shadow-black/35"
                >
                  <div className="grid gap-5 p-5 lg:grid-cols-[140px_1fr_260px]">
                    <div className="h-36 w-36 overflow-hidden rounded-[24px] border border-[#3A3328] bg-[#0E0C0A]/80">
                      {record.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={record.cover_url}
                          alt={`${record.artist ?? "Unknown Artist"} - ${
                            record.title ?? "Untitled"
                          }`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8E8170]">
                          No Cover
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${priorityTone(
                            record.queue_priority,
                          )}`}
                        >
                          {priorityLabel(record.queue_priority)}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${statusTone(
                            record.value_pull_status,
                          )}`}
                        >
                          {statusLabel(record.value_pull_status)}
                        </span>

                        {record.discogs_release_id && (
                          <span className="rounded-full border border-[#3A3328] bg-[#17130F]/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#D8CBB8]">
                            Discogs #{record.discogs_release_id}
                          </span>
                        )}

                        {record.discogs_release_id &&
                          (!record.cover_url ||
                            record.cover_url.trim() === "") && (
                            <span className="rounded-full border border-[#C7A45D]/45 bg-[#C7A45D]/12 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#F4EFE6]">
                              Missing Cover
                            </span>
                          )}
                      </div>

                      <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C7A45D]">
                        {record.artist || "Unknown Artist"}
                      </div>

                      <h2 className="mt-2 text-2xl font-bold leading-tight tracking-tight">
                        {record.title || "Untitled"}
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-[#B8AA96]">
                        {[record.label, record.catalogue_number, record.year_released]
                          .filter(Boolean)
                          .join(" • ") || "Release details not cataloged"}
                      </p>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <QueueMini
                          label="Estimate"
                          value={formatMoney(record.estimated_value)}
                        />

                        <QueueMini
                          label="Discogs Low"
                          value={formatMoney(record.discogs_low_price)}
                        />

                        <QueueMini
                          label="Discogs Median"
                          value={formatMoney(record.discogs_median_price)}
                        />

                        <QueueMini
                          label="Discogs High"
                          value={formatMoney(record.discogs_high_price)}
                        />
                      </div>

                      {record.value_pull_note && (
                        <p className="mt-4 rounded-2xl border border-[#3A3328] bg-[#17130F]/80 px-4 py-3 text-xs leading-5 text-[#D8CBB8]">
                          {record.value_pull_note}
                        </p>
                      )}
                    </div>

                    <div className="rounded-[24px] border border-[#3A3328] bg-[#0E0C0A]/70 p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8E8170]">
                        Queue Priority
                      </div>

                      <div className="mt-2 text-4xl font-bold text-[#F4EFE6]">
                        {record.queue_priority}
                      </div>

                      <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8E8170]">
                        Last Value Update
                      </div>

                      <div className="mt-2 text-xl font-bold text-[#F4EFE6]">
                        {formatDate(record.value_last_updated)}
                      </div>

                      <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8E8170]">
                        Last Pull Attempt
                      </div>

                      <div className="mt-2 text-sm font-bold text-[#F4EFE6]">
                        {formatDate(record.value_pull_last_attempted_at)}
                      </div>

                      <div className="mt-5 flex flex-col gap-2">
                        <Link
                          href={recordHref}
                          className="rounded-xl bg-gradient-to-r from-[#C7A45D] to-[#8F6F35] px-4 py-2.5 text-center text-xs font-bold text-[#11100E] transition hover:opacity-90"
                        >
                          Open Record
                        </Link>

                        <Link
                          href={`/collection?q=${encodeURIComponent(
                            `${record.artist ?? ""} ${record.title ?? ""}`.trim(),
                          )}`}
                          className="rounded-xl border border-[#8F6F35]/50 bg-[#C7A45D]/12 px-4 py-2.5 text-center text-xs font-bold text-[#F4EFE6] transition hover:bg-[#C7A45D]/20"
                        >
                          Search Collection
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function QueueMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[28px] border border-[#3A3328] bg-[linear-gradient(145deg,_#211B14,_#0E0C0A)] p-5 shadow-xl shadow-black/25">
      <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C7A45D]">
        {label}
      </div>

      <div className="mt-3 text-3xl font-bold text-[#F4EFE6]">{value}</div>

      <p className="mt-2 text-sm leading-6 text-[#B8AA96]">{helper}</p>
    </div>
  );
}

function QueueMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#3A3328] bg-[#17130F]/80 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8E8170]">
        {label}
      </div>

      <div className="mt-2 truncate text-sm font-bold text-[#F4EFE6]">
        {value}
      </div>
    </div>
  );
}