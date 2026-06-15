"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  estimated_value?: string | number | null;
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
  discogs_sale_blocked?: boolean | null;
  discogs_sale_blocked_reason?: string | null;
};

type SortOption = {
  value: string;
  label: string;
};

type ViewMode = "tiles" | "grid" | "list";

type CollectionUIProps = {
  records: CollectionRecord[];
  totalCount?: number;
  sort?: string;
  searchQuery?: string;
  preset?: string;
  view?: string;
  presetCounts?: Record<string, number> | unknown;
  sortOptions?: readonly SortOption[] | unknown;
  savedViews?: unknown;
  addRecordForm?: React.ReactNode;
};

const DEFAULT_SORT_OPTIONS: readonly SortOption[] = [
  { value: "id_desc", label: "Date Added / ID Newest" },
  { value: "id_asc", label: "Date Added / ID Oldest" },
  { value: "artist_asc", label: "Artist A–Z" },
  { value: "artist_desc", label: "Artist Z–A" },
  { value: "title_asc", label: "Title A–Z" },
  { value: "title_desc", label: "Title Z–A" },
  { value: "year_desc", label: "Year Newest" },
  { value: "year_asc", label: "Year Oldest" },
];

const PRESET_OPTIONS = [
  { value: "all", label: "All Records" },
  { value: "missing_covers", label: "Missing Covers" },
  { value: "missing_discogs", label: "Missing Discogs ID" },
  { value: "review_queue", label: "Review Queue" },
  { value: "needs_pricing", label: "Needs Pricing" },
  { value: "needs_year", label: "Needs Year" },
  { value: "exceptions", label: "Exceptions" },
  { value: "high_confidence", label: "High Confidence" },
  { value: "medium_confidence", label: "Medium Confidence" },
  { value: "low_confidence", label: "Low Confidence" },
  { value: "needs_verification", label: "Needs Verification" },
];

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
    getNumericValue(record.estimated_value) ||
    getNumericValue(record.discogs_median_price) ||
    getNumericValue(record.median_price)
  );
}

function getDisplayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "—";
  }

  return String(value);
}

function getCount(
  presetCounts: CollectionUIProps["presetCounts"],
  key: string,
) {
  if (!presetCounts || typeof presetCounts !== "object") return null;
  const value = (presetCounts as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

function normalizeSortOptions(
  sortOptions: CollectionUIProps["sortOptions"],
): readonly SortOption[] {
  if (!Array.isArray(sortOptions)) return DEFAULT_SORT_OPTIONS;

  const validOptions = sortOptions.filter((option): option is SortOption => {
    if (!option || typeof option !== "object") return false;

    const possible = option as Partial<SortOption>;

    return (
      typeof possible.value === "string" &&
      typeof possible.label === "string"
    );
  });

  return validOptions.length > 0 ? validOptions : DEFAULT_SORT_OPTIONS;
}

function normalizeViewMode(value: string | null | undefined): ViewMode {
  if (value === "grid" || value === "list" || value === "tiles") {
    return value;
  }

  return "tiles";
}

function buildCollectionReturnPath({
  searchQuery,
  preset,
  sort,
  view,
}: {
  searchQuery: string;
  preset: string;
  sort: string;
  view: ViewMode;
}) {
  const params = new URLSearchParams();

  if (searchQuery.trim() !== "") {
    params.set("q", searchQuery);
  }

  if (preset && preset !== "all") {
    params.set("preset", preset);
  }

  if (sort && sort !== "id_desc") {
    params.set("sort", sort);
  }

  if (view !== "tiles") {
    params.set("view", view);
  }

  const query = params.toString();
  return query ? `/collection?${query}` : "/collection";
}

function buildCollectionHref({
  preset,
  selectedView,
}: {
  preset: string;
  selectedView: ViewMode;
}) {
  const params = new URLSearchParams();
  params.set("preset", preset);

  if (selectedView !== "tiles") {
    params.set("view", selectedView);
  }

  return `/collection?${params.toString()}`;
}

export function CollectionUI({
  records,
  totalCount,
  sort = "id_desc",
  searchQuery = "",
  preset = "all",
  view = "tiles",
  presetCounts,
  sortOptions,
  addRecordForm,
}: CollectionUIProps) {
  const [showAddRecordPanel, setShowAddRecordPanel] = useState(false);

  const selectedView = normalizeViewMode(view);

  const returnToPath = buildCollectionReturnPath({
    searchQuery,
    preset,
    sort,
    view: selectedView,
  });

  const scrollStorageKey = `collector-scroll:${returnToPath}`;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    const savedScroll = window.sessionStorage.getItem(scrollStorageKey);

    if (!savedScroll) {
      return () => {
        window.history.scrollRestoration = previousScrollRestoration;
      };
    }

    const scrollY = Number(savedScroll);

    if (!Number.isFinite(scrollY)) {
      return () => {
        window.history.scrollRestoration = previousScrollRestoration;
      };
    }

    const restoreScroll = () => {
      window.scrollTo({
        top: scrollY,
        behavior: "auto",
      });
    };

    const animationFrame = window.requestAnimationFrame(restoreScroll);

    const timers = [
      window.setTimeout(restoreScroll, 100),
      window.setTimeout(restoreScroll, 300),
      window.setTimeout(restoreScroll, 700),
      window.setTimeout(restoreScroll, 1200),
    ];

    return () => {
      window.cancelAnimationFrame(animationFrame);
      timers.forEach((timer) => window.clearTimeout(timer));
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [scrollStorageKey, records.length, selectedView]);

  function saveScrollPosition() {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(scrollStorageKey, String(window.scrollY));
  }

  const totalValue = useMemo(() => {
    return records.reduce((sum, record) => sum + getEstimatedValue(record), 0);
  }, [records]);

  const visibleCount = records.length;
  const fullCount = totalCount ?? visibleCount;
  const safeSortOptions = normalizeSortOptions(sortOptions);

  function buildRecordHref(recordId: CollectionRecord["id"]) {
    return `/collection/${recordId}?returnTo=${encodeURIComponent(returnToPath)}`;
  }

  return (
    <main className="min-h-screen bg-[#0E0C0A] p-6 text-[#F4EFE6]">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-[#3A3328] bg-[linear-gradient(135deg,_#0E0C0A,_#17130F_58%,_#272017)] p-6 shadow-2xl">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="w-full max-w-5xl">
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
                {preset && preset !== "all" ? ` • View: ${preset}` : ""} •
                Display: {selectedView === "tiles" ? "Tiles" : selectedView === "grid" ? "Grid" : "List"}
              </p>

              <form
                method="get"
                action="/collection"
                className="mt-5 grid gap-3 xl:grid-cols-[1fr_190px_190px_160px_auto_auto]"
              >
                <input
                  type="text"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Search artist, title, label, catalog number, notes..."
                  className="min-h-12 rounded-2xl border border-[#3A3328] bg-[#11100E] px-4 text-sm text-[#F4EFE6] outline-none placeholder:text-[#7A6F61] focus:border-[#C7A45D]"
                />

                <select
                  name="preset"
                  defaultValue={preset}
                  className="min-h-12 rounded-2xl border border-[#3A3328] bg-[#11100E] px-4 text-sm text-[#F4EFE6] outline-none focus:border-[#C7A45D]"
                >
                  {PRESET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  name="sort"
                  defaultValue={sort}
                  className="min-h-12 rounded-2xl border border-[#3A3328] bg-[#11100E] px-4 text-sm text-[#F4EFE6] outline-none focus:border-[#C7A45D]"
                >
                  {safeSortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  name="view"
                  defaultValue={selectedView}
                  className="min-h-12 rounded-2xl border border-[#3A3328] bg-[#11100E] px-4 text-sm text-[#F4EFE6] outline-none focus:border-[#C7A45D]"
                >
                  <option value="tiles">Tiles View</option>
                  <option value="grid">Grid View</option>
                  <option value="list">List View</option>
                </select>

                <button
                  type="submit"
                  className="min-h-12 rounded-2xl bg-[#C7A45D] px-5 text-sm font-bold text-black hover:bg-[#D8B86A]"
                >
                  Search
                </button>

                <Link
                  href="/collection"
                  className="flex min-h-12 items-center justify-center rounded-2xl border border-[#8F6F35] px-5 text-sm font-bold text-[#C7A45D] hover:bg-[#221F1A]"
                >
                  Reset
                </Link>
              </form>
            </div>

            <div className="flex w-full flex-wrap gap-3 xl:w-auto xl:max-w-xs xl:justify-end">
              <button
                type="button"
                onClick={() => setShowAddRecordPanel(true)}
                className="rounded-xl bg-[#C7A45D] px-4 py-3 text-sm font-bold text-black hover:bg-[#D8B86A]"
              >
                + Add Record
              </button>

              <ActionLink
                href="/collection/value-dashboard"
                label="Value Dashboard"
                primary
              />
            <ActionLink
  href="/collection/market-intelligence"
  label="Market Intelligence"
/>

<ActionLink
  href="/collection/market-leaders"
  label="Market Leaders"
  primary
/>

<ActionLink
  href="/collection/value-queue"
  label="Value Queue"
/>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#3A3328] bg-[#17130F] p-4 shadow-xl">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C7A45D]">
            Command Center
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <CommandLink
              href={buildCollectionHref({ preset: "missing_covers", selectedView })}
              title="Missing Covers"
              count={getCount(presetCounts, "missing_covers")}
              description="Records that need cover repair."
            />
            <CommandLink
              href={buildCollectionHref({ preset: "review_queue", selectedView })}
              title="Review Queue"
              count={getCount(presetCounts, "review_queue")}
              description="Items marked for manual review."
            />
            <CommandLink
              href={buildCollectionHref({ preset: "needs_pricing", selectedView })}
              title="Needs Pricing"
              count={getCount(presetCounts, "needs_pricing")}
              description="Records missing value data."
            />
            <CommandLink
              href={buildCollectionHref({ preset: "exceptions", selectedView })}
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
              No records match this view.
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#B8AA96]">
              Try clearing the search, changing the saved view, or adding a new
              record. Records are tied to the signed-in user.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowAddRecordPanel(true)}
                className="rounded-xl bg-[#C7A45D] px-4 py-3 text-sm font-bold text-black hover:bg-[#D8B86A]"
              >
                + Add Record
              </button>

              <Link
                href="/collection"
                className="rounded-xl border border-[#8F6F35] px-4 py-3 text-sm font-bold text-[#C7A45D] hover:bg-[#221F1A]"
              >
                Reset View
              </Link>
            </div>
          </section>
        ) : selectedView === "list" ? (
          <ListRecords
            records={records}
            buildRecordHref={buildRecordHref}
            saveScrollPosition={saveScrollPosition}
          />
        ) : selectedView === "grid" ? (
          <GridRecords
            records={records}
            buildRecordHref={buildRecordHref}
            saveScrollPosition={saveScrollPosition}
          />
        ) : (
          <TileRecords
            records={records}
            buildRecordHref={buildRecordHref}
            saveScrollPosition={saveScrollPosition}
          />
        )}
      </div>

      {showAddRecordPanel ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close add record panel"
            className="absolute inset-0 h-full w-full cursor-default bg-black/70"
            onClick={() => setShowAddRecordPanel(false)}
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-[#3A3328] bg-[#0F1623] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C7A45D]">
                  Add Record
                </div>
                <h2 className="mt-2 text-2xl font-bold">Collector Intake</h2>
                <p className="mt-2 text-sm leading-6 text-[#B8AA96]">
                  Add a new entry when needed. The form stays out of the main
                  collection view until you open it.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddRecordPanel(false)}
                className="rounded-xl border border-[#8F6F35] px-4 py-2 text-sm font-bold text-[#C7A45D] hover:bg-[#221F1A]"
              >
                Close
              </button>
            </div>

            <div className="rounded-[28px] border border-[#23314A] bg-[#0B1020] p-5">
              {addRecordForm}
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}

function ListRecords({
  records,
  buildRecordHref,
  saveScrollPosition,
}: {
  records: CollectionRecord[];
  buildRecordHref: (recordId: CollectionRecord["id"]) => string;
  saveScrollPosition: () => void;
}) {
  return (
    <section className="space-y-3">
      {records.map((record) => {
        const estimatedValue = getEstimatedValue(record);
        const discogsMedian = getDiscogsMedian(record);

        return (
          <article
            key={String(record.id)}
            className="rounded-[24px] border border-[#3A3328] bg-[linear-gradient(145deg,_#211B14,_#0E0C0A)] p-4 shadow-xl shadow-black/30"
          >
            <div className="grid gap-4 md:grid-cols-[88px_1fr_auto] md:items-center">
              <RecordCoverLink
                record={record}
                href={buildRecordHref(record.id)}
                onClick={saveScrollPosition}
                size="small"
              />

              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C7A45D]">
                  {record.artist || "Unknown Artist"}
                </div>

                <Link href={buildRecordHref(record.id)} onClick={saveScrollPosition}>
                  <h2 className="mt-1 truncate text-xl font-bold hover:text-[#C7A45D]">
                    {record.title || "Untitled"}
                  </h2>
                </Link>

                <p className="mt-1 text-sm leading-6 text-[#B8AA96]">
                  {[record.label, record.catalogue_number, record.year_released, record.country]
                    .filter(Boolean)
                    .join(" • ") || "Release details not cataloged"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <SmallPill label="Discogs" value={formatMoney(discogsMedian)} />
                  <SmallPill label="Estimate" value={formatMoney(estimatedValue)} />
                  <SmallPill label="Media" value={record.media_grade || record.condition || "—"} />
                  <SmallPill label="Sleeve" value={record.sleeve_grade || "—"} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">
                <Link
                  href={buildRecordHref(record.id)}
                  onClick={saveScrollPosition}
                  className="rounded-xl bg-[#C7A45D] px-4 py-2.5 text-center text-sm font-bold text-black hover:bg-[#D8B86A]"
                >
                  Open
                </Link>

                <Link
                  href={buildRecordHref(record.id)}
                  onClick={saveScrollPosition}
                  className="rounded-xl border border-[#8F6F35] px-4 py-2.5 text-center text-sm font-bold text-[#C7A45D] hover:bg-[#221F1A]"
                >
                  Edit
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function GridRecords({
  records,
  buildRecordHref,
  saveScrollPosition,
}: {
  records: CollectionRecord[];
  buildRecordHref: (recordId: CollectionRecord["id"]) => string;
  saveScrollPosition: () => void;
}) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
      {records.map((record) => {
        const estimatedValue = getEstimatedValue(record);
        const discogsMedian = getDiscogsMedian(record);

        return (
          <article
            key={String(record.id)}
            className="rounded-[22px] border border-[#3A3328] bg-[linear-gradient(145deg,_#211B14,_#0E0C0A)] p-4 shadow-xl shadow-black/30"
          >
            <div className="flex gap-3">
              <RecordCoverLink
                record={record}
                href={buildRecordHref(record.id)}
                onClick={saveScrollPosition}
                size="small"
              />

              <div className="min-w-0 flex-1">
                <div className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C7A45D]">
                  {record.artist || "Unknown Artist"}
                </div>

                <Link href={buildRecordHref(record.id)} onClick={saveScrollPosition}>
                  <h2 className="mt-1 line-clamp-2 text-sm font-bold leading-snug hover:text-[#C7A45D]">
                    {record.title || "Untitled"}
                  </h2>
                </Link>

                <p className="mt-1 truncate text-xs text-[#B8AA96]">
                  {[record.label, record.year_released].filter(Boolean).join(" • ") || "No label/year"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <MiniStat label="Discogs" value={formatMoney(discogsMedian)} />
              <MiniStat label="Estimate" value={formatMoney(estimatedValue)} />
              <MiniStat label="Media" value={record.media_grade || record.condition || "—"} />
              <MiniStat label="Sleeve" value={record.sleeve_grade || "—"} />
            </div>

            <Link
              href={buildRecordHref(record.id)}
              onClick={saveScrollPosition}
              className="mt-4 flex w-full items-center justify-center rounded-xl border border-[#8F6F35] px-3 py-2 text-xs font-bold text-[#C7A45D] hover:bg-[#221F1A]"
            >
              Open Record
            </Link>
          </article>
        );
      })}
    </section>
  );
}

function TileRecords({
  records,
  buildRecordHref,
  saveScrollPosition,
}: {
  records: CollectionRecord[];
  buildRecordHref: (recordId: CollectionRecord["id"]) => string;
  saveScrollPosition: () => void;
}) {
  return (
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
                <RecordCoverLink
                  record={record}
                  href={buildRecordHref(record.id)}
                  onClick={saveScrollPosition}
                  size="large"
                />
              </div>

              <div className="mt-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C7A45D]">
                  {record.artist || "Unknown Artist"}
                </div>

                <Link href={buildRecordHref(record.id)} onClick={saveScrollPosition}>
                  <h2 className="mt-2 text-2xl font-bold leading-tight hover:text-[#C7A45D]">
                    {record.title || "Untitled"}
                  </h2>
                </Link>

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

                {record.discogs_sale_blocked ? (
                  <p className="mt-3 rounded-xl border border-blue-400/30 bg-blue-400/10 px-3 py-2 text-xs leading-5 text-blue-100">
                    Discogs sale/value pull blocked
                    {record.discogs_sale_blocked_reason
                      ? `: ${record.discogs_sale_blocked_reason}`
                      : "."}
                  </p>
                ) : !record.discogs_median_price && record.discogs_release_id ? (
                  <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                    Discogs ID is present, but market data has not been pulled yet.
                    Open details and click Pull Market Data.
                  </p>
                ) : null}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Link
                  href={buildRecordHref(record.id)}
                  onClick={saveScrollPosition}
                  className="rounded-xl bg-[#C7A45D] px-4 py-3 text-center text-sm font-bold text-black hover:bg-[#D8B86A]"
                >
                  View Details
                </Link>

                <Link
                  href={buildRecordHref(record.id)}
                  onClick={saveScrollPosition}
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
  );
}

function RecordCoverLink({
  record,
  href,
  onClick,
  size,
}: {
  record: CollectionRecord;
  href: string;
  onClick: () => void;
  size: "small" | "large";
}) {
  const className =
    size === "large"
      ? "h-48 w-48 overflow-hidden rounded-[22px] border border-[#3A3328] bg-black shadow-xl shadow-black/35"
      : "h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[#3A3328] bg-black";

  const imageClassName =
    size === "large" ? "h-full w-full object-contain" : "h-20 w-20 object-cover";

  return (
    <Link href={href} onClick={onClick} className={className}>
      {record.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={record.cover_url}
          alt={`${record.artist ?? "Unknown Artist"} - ${record.title ?? "Untitled"}`}
          className={imageClassName}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-[#8E8170]">
          No Cover
        </div>
      )}
    </Link>
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
        {getDisplayValue(value)}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[#3A3328] bg-[#11100E] px-3 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8E8170]">
        {label}
      </div>
      <div className="mt-1 truncate text-xs font-bold text-[#F4EFE6]">
        {String(value)}
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

function SmallPill({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <span className="rounded-full border border-[#3A3328] bg-[#17130F] px-3 py-1 text-xs text-[#D8CBB8]">
      <span className="text-[#8E8170]">{label}: </span>
      <span className="font-semibold text-[#F4EFE6]">
        {getDisplayValue(value)}
      </span>
    </span>
  );
}
