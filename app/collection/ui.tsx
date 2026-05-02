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

export function CollectionUI({
  records,
}: {
  records: CollectionRecord[];
  totalCount?: number;
  sort?: string;
  searchQuery?: string;
  preset?: string;
  presetCounts?: unknown;
  sortOptions?: unknown;
  savedViews?: unknown;
  addRecordForm?: React.ReactNode;
}) {
  const totalValue = useMemo(() => {
    return records.reduce((sum, record) => sum + getEstimatedValue(record), 0);
  }, [records]);

  return (
    <main className="min-h-screen bg-[#0E0C0A] p-6 text-[#F4EFE6]">
      <section className="mb-8 rounded-[32px] border border-[#3A3328] bg-[linear-gradient(135deg,_#0E0C0A,_#17130F_58%,_#272017)] p-6 shadow-2xl">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C7A45D]">
          Collector Archive
        </div>

        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Private Collection Registry
        </h1>

        <p className="mt-2 text-sm text-[#B8AA96]">
          {records.length} visible records • Estimated value{" "}
          {formatMoney(totalValue)}
        </p>
      </section>

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
                <div className="h-56 overflow-hidden rounded-[24px] border border-[#3A3328] bg-black">
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
                    <div className="flex h-full items-center justify-center text-sm text-[#8E8170]">
                      No Cover
                    </div>
                  )}
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
                    <ValueBox
                      label="Discogs"
                      value={formatMoney(discogsMedian)}
                    />
                    <ValueBox
                      label="Estimate"
                      value={formatMoney(estimatedValue)}
                    />
                    <ValueBox
                      label="High"
                      value={formatMoney(record.discogs_high_price)}
                    />
                  </div>

                  {!record.discogs_median_price && record.discogs_release_id ? (
                    <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                      Discogs ID is present, but market data has not been pulled yet.
                      Open details and click Pull Market Data.
                    </p>
                  ) : null}
                </div>

                <Link
                  href={`/collection/${record.id}`}
                  className="mt-5 block rounded-xl bg-[#C7A45D] px-4 py-3 text-center text-sm font-bold text-black hover:bg-[#D8B86A]"
                >
                  View Details
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </main>
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
