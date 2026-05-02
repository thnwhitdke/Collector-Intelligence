"use client";

import Link from "next/link";
import { useMemo } from "react";

export type CollectionRecord = {
  id: number | string | null;
  artist: string | null;
  title: string | null;
  format: string | null;
  cover_present?: string | null;
  cover_url: string | null;
  label: string | null;
  catalogue_number: string | null;
  year_released: string | null;
  country: string | null;
  notes?: string | null;
  sealed_status?: string | null;
  discogs_url: string | null;
  discogs_release_id: string | number | null;
  discogs_master_id: string | number | null;
  median_price?: string | number | null;
  low_price?: string | number | null;
  high_price?: string | number | null;
  discogs_low_price?: string | number | null;
  discogs_median_price?: string | number | null;
  discogs_high_price?: string | number | null;
  purchase_price?: string | number | null;
  current_value?: string | number | null;
  possible_duplicate?: boolean | null;
  media_grade?: string | null;
  sleeve_grade?: string | null;
  condition?: string | null;
  ebay_last_sold_price?: string | number | null;
  ebay_sold_comp_count?: string | number | null;
  ebay_low_sold_price?: string | number | null;
  ebay_median_sold_price?: string | number | null;
  ebay_high_sold_price?: string | number | null;
};

type CollectionUIProps = {
  records: CollectionRecord[];
  totalCount?: number;
  sort?: string;
  searchQuery?: string;
  preset?: string;
  presetCounts?: Record<string, number> | unknown;
  sortOptions?: readonly { value: string; label: string }[] | unknown;
  savedViews?: unknown;
  addRecordForm?: React.ReactNode;
};

function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "—";
  }

  const n = Number(String(value).replace(/[$,]/g, ""));
  if (!Number.isFinite(n)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function getNumericValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return 0;
  }

  const n = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function getDiscogsMedian(record: CollectionRecord) {
  return record.discogs_median_price ?? record.median_price ?? null;
}

function getEstimatedValue(record: CollectionRecord) {
  return (
    getNumericValue(record.current_value) ||
    getNumericValue(record.discogs_median_price) ||
    getNumericValue(record.median_price)
  );
}

function getCount(
  presetCounts: CollectionUIProps["presetCounts"],
  key: string,
) {
  if (!presetCounts || typeof presetCounts !== "object") return null;
  const value = (presetCounts as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

export function CollectionUI({
  records,
  totalCount,
  searchQuery,
  preset,
  presetCounts,
  addRecordForm,
}: CollectionUIProps) {
  const totalValue = useMemo(() => {
    return records.reduce((sum, record) => sum + getEstimatedValue(record), 0);
  }, [records]);

  const visibleCount = records.length;
  const fullCount = totalCount ?? visibleCount;

  return (
    <main className="min-h-screen bg-[#0E0C0A] p-6 text-[#F4EFE6]">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-[#3A3328] bg-[linear-gradient(135deg,_#0E0C0A,_#17130F_58%,_#272017)] p-6 shadow-2xl">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C7A45D]">
                Collector Intelligence
              </div>

              <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                Private Collection Registry
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#B8AA96]">
                {visibleCount} visible records
                {fullCount !== visibleCount ? ` of ${fullCount} total` : ""} •
                Estimated visible value {formatMoney(totalValue)}
                {searchQuery ? ` • Search: “${searchQuery}”` : ""}
                {preset && preset !== "all" ? ` • View: ${preset}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {addRecordForm}

              <ActionLink href="/collection/value-dashboard" label="Value Dashboard" primary />
              <ActionLink href="/collection/market-intelligence" label="Market Intelligence" />
              <ActionLink href="/collection/value-queue" label="Value Queue" />
              <ActionLink href="/api/export/collection" label="Export Collection" />
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#3A3328] bg-[#17130F] p-4 shadow-xl">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C7A45D]">
            Command Center
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <CommandLink
              href="/collection?preset=missing_covers"
              title="Missing Covers"
              count={getCount(presetCounts, "missing_covers")}
              description="Records that need cover repair."
            />
            <CommandLink
              href="/collection?preset=review_queue"
              title="Review Queue"
              count={getCount(presetCounts, "review_queue")}
              description="Items marked for manual review."
            />
            <CommandLink
              href="/collection?preset=needs_pricing"
              title="Needs Pricing"
              count={getCount(presetCounts, "needs_pricing")}
              description="Records missing value data."
            />
            <CommandLink
              href="/collection?preset=exceptions"
              title="Exceptions"
              count={getCount(presetCounts, "exceptions")}
              description="Records needing cleanup attention."
            />
          </div>
        </section>

        {records.length === 0 ? (
          <section className="rounded-[32px] border border-dashed border-[#5A4A32] bg-[#17130F] p-10 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C7A45D]">
              Empty Collection
            </div>

            <h2 className="mt-3 text-2xl font-bold">
              Start building this private archive.
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#B8AA96]">
              This account does not have records yet. Use Add Record to begin a
              new collection. Records are tied to the signed-in user.
            </p>

            <div className="mt-6 flex justify-center">{addRecordForm}</div>
          </section>
        ) : (
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {records.map((record) => {
              const estimatedValue = getEstimatedValue(record);
              const discogsMedian = getDiscogsMedian(record);

              return (
                <article
                  key={String(record.id)}
                  className="overflow-hidden rounded-[28px] border border-[#3A3328] bg-[linear-gradient(145deg,_#282218,_#0E0C0A_48%,_#1B1712)] shadow-2xl shadow-black/40"
                >
                  <div className="p-5">
                    <div className="flex justify-center">
                      <div className="h-48 w-48 overflow-hidden rounded-[22px] border border-[#3A3328] bg-black shadow-xl shadow-black/35">
                        {record.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={record.cover_url}
                            alt={`${record.artist ?? "Unknown Artist"} - ${
                              record.title ?? "Untitled"
                            }`}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-[#8E8170]">
                            No Cover
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C7A45D]">
                        {record.artist || "Unknown Artist"}
                      </div>

                      <h2 className="mt-2 text-2xl font-bold leading-tight">
                        {record.title || "Untitled"}
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-[#B8AA96]">
                        {[record.label, record.catalogue_number]
                          .filter(Boolean)
                          .join(" • ") || "Label details not cataloged"}
                      </p>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <InfoBox label="Year" value={record.year_released} />
                      <InfoBox label="Country" value={record.country} />
                      <InfoBox label="Discogs Release ID" value={record.discogs_release_id} />
                      <InfoBox label="Discogs Master ID" value={record.discogs_master_id} />
                    </div>

                    <div className="mt-5 rounded-[24px] border border-[#3A3328] bg-[#0E0C0A]/75 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C7A45D]">
                        Value Intelligence
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <ValueBox label="Discogs" value={formatMoney(discogsMedian)} />
                        <ValueBox label="Estimate" value={formatMoney(estimatedValue)} />
                        <ValueBox label="High" value={formatMoney(record.discogs_high_price)} />
                      </div>

                      {!record.discogs_median_price && record.discogs_release_id ? (
                        <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                          Discogs ID is present, but market data has not been pulled yet.
                          Open details and click Pull Market Data.
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <Link
                        href={`/collection/${record.id}`}
                        className="rounded-xl bg-[#C7A45D] px-4 py-3 text-center text-sm font-bold text-black hover:bg-[#D8B86A]"
                      >
                        View Details
                      </Link>

                      <Link
                        href={`/collection/${record.id}?returnTo=/collection`}
                        className="rounded-xl border border-[#8F6F35] px-4 py-3 text-center text-sm font-bold text-[#C7A45D] hover:bg-[#221F1A]"
                      >
                        Edit / Repair
                      </Link>
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

function ActionLink({
  href,
  label,
  primary = false,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "rounded-xl bg-[#C7A45D] px-4 py-3 text-sm font-bold text-black hover:bg-[#D8B86A]"
          : "rounded-xl border border-[#8F6F35] px-4 py-3 text-sm font-bold text-[#C7A45D] hover:bg-[#221F1A]"
      }
    >
      {label}
    </Link>
  );
}

function CommandLink({
  href,
  title,
  count,
  description,
}: {
  href: string;
  title: string;
  count: number | null;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-[#3A3328] bg-[#0E0C0A]/80 p-4 hover:border-[#C7A45D]/70 hover:bg-[#221F1A]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-[#F4EFE6]">{title}</div>
          <div className="mt-2 text-xs leading-5 text-[#B8AA96]">
            {description}
          </div>
        </div>

        {count !== null ? (
          <div className="rounded-full border border-[#8F6F35] px-3 py-1 text-xs font-bold text-[#C7A45D]">
            {count}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="min-h-[76px] rounded-2xl border border-[#3A3328] bg-[#17130F]/80 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8E8170]">
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-semibold text-[#F4EFE6]">
        {value === null || value === undefined || String(value).trim() === ""
          ? "—"
          : String(value)}
      </div>
    </div>
  );
}

function ValueBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[76px] rounded-2xl border border-[#3A3328] bg-[#17130F]/80 p-3 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8E8170]">
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-bold text-[#F4EFE6]">
        {value}
      </div>
    </div>
  );
}