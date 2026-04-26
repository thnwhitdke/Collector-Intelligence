"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import AddRecordSlideOver from "./AddRecordSlideOver";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import {
  bulkFixMissingCovers,
  clearReviewFlag,
  createSavedView,
  fixCover,
  saveDiscogsMatch,
  searchDiscogsMatches,
  setReviewFlag,
  type DiscogsMatchResult,
  type SavedViewRow,
} from "../actions/records";
import type { SavedViewPreset } from "./page";
import {
  clearLastViewedRecord,
  readLastViewedRecord,
} from "./lastViewedRecord";
import { calculateValueConfidence } from "../../src/lib/value-confidence";

export type CollectionRecord = {
  id: number | string | null;
  artist: string | null;
  title: string | null;
  format: string | null;
  cover_present: string | null;
  label: string | null;
  catalogue_number: string | null;
  year_released: string | null;
  country: string | null;
  notes: string | null;
  sealed_status: string | null;
  discogs_url: string | null;
  median_price: string | null;
  discogs_release_id: string | number | null;
  discogs_master_id: string | number | null;
  cover_url: string | null;
  possible_duplicate: boolean | null;
  media_grade?: string | null;
  sleeve_grade?: string | null;
  condition?: string | null;
  purchase_price?: string | number | null;
  current_value?: string | number | null;
  low_price?: string | number | null;
  high_price?: string | number | null;
  ebay_last_sold_price?: string | number | null;
  ebay_sold_comp_count?: string | number | null;
  ebay_low_sold_price?: string | number | null;
  ebay_median_sold_price?: string | number | null;
  ebay_high_sold_price?: string | number | null;
};

type SortOption = {
  value: string;
  label: string;
};

type PresetCounts = {
  all: number;
  missing_covers: number;
  missing_discogs: number;
  review_queue: number;
  needs_pricing: number;
  needs_year: number;
  exceptions: number;
  high_confidence: number;
  medium_confidence: number;
  low_confidence: number;
  needs_verification: number;
};

type CollectionUIProps = {
  records: CollectionRecord[];
  totalCount: number;
  sort: string;
  searchQuery: string;
  preset: SavedViewPreset;
  presetCounts: PresetCounts;
  sortOptions: readonly SortOption[];
  savedViews: SavedViewRow[];
  addRecordForm?: ReactNode;
};

type BulkResult = {
  success: boolean;
  processed: number;
  fixed: number;
  skipped: number;
  failed: number;
  remainingActionable: number;
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function yesLike(value: string | null | undefined) {
  const v = normalizeText(value).toLowerCase();
  return v === "yes" || v === "y" || v === "true" || v === "1";
}

function hasRealCover(record: CollectionRecord) {
  if (record.cover_url && String(record.cover_url).trim() !== "") return true;
  if (yesLike(record.cover_present)) return true;
  return false;
}

function hasDiscogsId(record: CollectionRecord) {
  return (
    record.discogs_release_id !== null &&
    record.discogs_release_id !== undefined &&
    String(record.discogs_release_id).trim() !== "" &&
    String(record.discogs_release_id).trim() !== "0"
  );
}

function isReviewFlagged(record: CollectionRecord) {
  return normalizeText(record.notes).includes("[REVIEW]");
}

function formatStatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

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

function getNumericValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return 0;
  }

  const numeric = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function getEstimatedValue(record: CollectionRecord) {
  return (
    getNumericValue(record.current_value) ||
    getNumericValue(record.median_price) ||
    getNumericValue(record.high_price)
  );
}

function getRecordValueConfidence(record: CollectionRecord) {
  const estimatedValue = getEstimatedValue(record);
  const discogsMedian = getNumericValue(record.median_price);
  const ebayLastSold = getNumericValue(record.ebay_last_sold_price);

  return calculateValueConfidence({
    estimated_value: estimatedValue,
    current_value: getNumericValue(record.current_value),
    purchase_price: getNumericValue(record.purchase_price),
    discogs_low_price: getNumericValue(record.low_price),
    discogs_median_price: discogsMedian,
    discogs_high_price: getNumericValue(record.high_price),
    ebay_last_sold_price: ebayLastSold,
    ebay_sold_comp_count: getNumericValue(record.ebay_sold_comp_count),
    ebay_low_sold_price: getNumericValue(record.ebay_low_sold_price),
    ebay_median_sold_price: getNumericValue(record.ebay_median_sold_price),
    ebay_high_sold_price: getNumericValue(record.ebay_high_sold_price),
  });
}

function getPrimaryGrade(record: CollectionRecord) {
  return (
    record.media_grade ||
    record.condition ||
    extractGradeFromNotes(record.notes) ||
    null
  );
}

function extractGradeFromNotes(notes: string | null) {
  if (!notes) return null;

  const gradePattern =
    /\b(Mint|Near Mint|NM|VG\+|VG|Good|Fair|Poor|G\+|G|F|P)\b/i;

  const match = notes.match(gradePattern);
  return match ? match[1] : null;
}

function matchesSearch(record: CollectionRecord, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    record.artist,
    record.title,
    record.label,
    record.catalogue_number,
    record.format,
    record.year_released,
    record.country,
    record.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

function buildDefaultMatchQuery(record: CollectionRecord) {
  return [record.artist, record.title, record.year_released]
    .filter((part) => part && String(part).trim() !== "")
    .join(" ");
}

function csvSafe(value: string | number | boolean | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: CollectionRecord[]) {
  const headers = [
    "id",
    "artist",
    "title",
    "format",
    "cover_present",
    "cover_url",
    "label",
    "catalogue_number",
    "year_released",
    "country",
    "sealed_status",
    "discogs_release_id",
    "discogs_master_id",
    "discogs_url",
    "median_price",
    "possible_duplicate",
    "notes",
  ];

  const lines = [
    headers.join(","),
    ...rows.map((record) =>
      [
        csvSafe(record.id),
        csvSafe(record.artist),
        csvSafe(record.title),
        csvSafe(record.format),
        csvSafe(record.cover_present),
        csvSafe(record.cover_url),
        csvSafe(record.label),
        csvSafe(record.catalogue_number),
        csvSafe(record.year_released),
        csvSafe(record.country),
        csvSafe(record.sealed_status),
        csvSafe(record.discogs_release_id),
        csvSafe(record.discogs_master_id),
        csvSafe(record.discogs_url),
        csvSafe(record.median_price),
        csvSafe(record.possible_duplicate ? "Yes" : "No"),
        csvSafe(record.notes),
      ].join(",")
    ),
  ];

  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

function buildExportFilename(base: string) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `${base}-${stamp}.csv`;
}

const SAVED_VIEWS: {
  value: SavedViewPreset;
  label: string;
}[] = [
  { value: "all", label: "All Records" },
  { value: "missing_covers", label: "Missing Covers" },
  { value: "missing_discogs", label: "Missing Discogs IDs" },
  { value: "review_queue", label: "Review Queue" },
  { value: "needs_pricing", label: "Needs Pricing" },
  { value: "needs_year", label: "Needs Year" },
  { value: "exceptions", label: "Exceptions" },
  { value: "high_confidence", label: "High Confidence" },
  { value: "medium_confidence", label: "Medium Confidence" },
  { value: "low_confidence", label: "Low / Unknown" },
  { value: "needs_verification", label: "Needs Verification" },
];

function filterByPreset(records: CollectionRecord[], preset: SavedViewPreset) {
  switch (preset) {
    case "missing_covers":
      return records.filter((record) => !hasRealCover(record));

    case "missing_discogs":
      return records.filter((record) => !hasDiscogsId(record));

    case "review_queue":
      return records.filter((record) => isReviewFlagged(record));

    case "needs_pricing":
      return records.filter(
        (record) =>
          record.median_price === null ||
          record.median_price === undefined ||
          String(record.median_price).trim() === ""
      );

    case "needs_year":
      return records.filter(
        (record) =>
          record.year_released === null ||
          record.year_released === undefined ||
          String(record.year_released).trim() === ""
      );

    case "exceptions":
      return records.filter((record) => {
        const missingPrice =
          record.median_price === null ||
          record.median_price === undefined ||
          String(record.median_price).trim() === "";

        const missingYear =
          record.year_released === null ||
          record.year_released === undefined ||
          String(record.year_released).trim() === "";

        return (
          !hasRealCover(record) ||
          !hasDiscogsId(record) ||
          isReviewFlagged(record) ||
          record.possible_duplicate === true ||
          missingPrice ||
          missingYear
        );
      });

    case "high_confidence":
      return records.filter((record) => {
        const confidence = getRecordValueConfidence(record);
        return confidence.label === "High";
      });

    case "medium_confidence":
      return records.filter((record) => {
        const confidence = getRecordValueConfidence(record);
        return confidence.label === "Medium";
      });

    case "low_confidence":
      return records.filter((record) => {
        const confidence = getRecordValueConfidence(record);
        return confidence.label === "Low" || confidence.label === "Unknown";
      });

    case "needs_verification":
      return records.filter((record) => {
        const confidence = getRecordValueConfidence(record);
        return confidence.score < 40;
      });

    case "all":
    default:
      return records;
  }
}

function buildSavedViewHref(view: SavedViewRow) {
  const params = new URLSearchParams();

  if (view.preset && view.preset !== "all") {
    params.set("preset", view.preset);
  }

  if (view.sort && view.sort !== "id_desc") {
    params.set("sort", view.sort);
  }

  if (view.search_query && view.search_query.trim() !== "") {
    params.set("q", view.search_query);
  }

  const query = params.toString();
  return query ? `/collection?${query}` : "/collection";
}

function buildCollectionHref({
  preset,
  sort,
  searchQuery,
}: {
  preset: SavedViewPreset;
  sort: string;
  searchQuery: string;
}) {
  const params = new URLSearchParams();

  if (preset && preset !== "all") params.set("preset", preset);
  if (sort && sort !== "id_desc") params.set("sort", sort);
  if (searchQuery.trim() !== "") params.set("q", searchQuery.trim());

  const query = params.toString();
  return query ? `/collection?${query}` : "/collection";
}

export function CollectionUI({
  records,
  totalCount,
  sort,
  searchQuery,
  preset,
  presetCounts,
  sortOptions,
  savedViews,
}: CollectionUIProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery ?? "");
  const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(
    null
  );
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [savedViewName, setSavedViewName] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [savedViewMessage, setSavedViewMessage] = useState<string | null>(null);
  const [matchQueries, setMatchQueries] = useState<Record<number, string>>({});
  const [matchResults, setMatchResults] = useState<
    Record<number, DiscogsMatchResult[]>
  >({});
  const [matchStatus, setMatchStatus] = useState<Record<number, string>>({});
  const [reviewReasons, setReviewReasons] = useState<Record<number, string>>({});
  const [isPending, startTransition] = useTransition();

  const currentReturnPath = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (localSearchQuery.trim() !== "") {
      params.set("q", localSearchQuery.trim());
    } else {
      params.delete("q");
    }

    if (preset && preset !== "all") {
      params.set("preset", preset);
    }

    if (sort && sort !== "id_desc") {
      params.set("sort", sort);
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams, localSearchQuery, preset, sort]);

  useEffect(() => {
    const lastViewedId = readLastViewedRecord();

    if (!lastViewedId) return;

    const timer = window.setTimeout(() => {
      setHighlightedRecordId(lastViewedId);

      window.setTimeout(() => {
        setHighlightedRecordId(null);
        clearLastViewedRecord();
      }, 2800);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const duplicateCount = useMemo(() => {
    return records.filter((record) => record.possible_duplicate === true).length;
  }, [records]);

  const filteredByPreset = useMemo(() => {
    return filterByPreset(records, preset);
  }, [records, preset]);

  const filteredRecords = useMemo(() => {
    let result = filteredByPreset.filter((record) =>
      matchesSearch(record, localSearchQuery)
    );

    if (showDuplicatesOnly) {
      result = result.filter((record) => record.possible_duplicate === true);
    }

    return result;
  }, [filteredByPreset, localSearchQuery, showDuplicatesOnly]);

  const totalWithCovers = useMemo(() => {
    return records.filter((record) => hasRealCover(record)).length;
  }, [records]);

  const totalMissingCovers = useMemo(() => {
    return records.filter((record) => !hasRealCover(record)).length;
  }, [records]);

  const missingDiscogsIdCount = useMemo(() => {
    return records.filter((record) => !hasDiscogsId(record)).length;
  }, [records]);

  const reviewQueueCount = useMemo(() => {
    return records.filter((record) => isReviewFlagged(record)).length;
  }, [records]);

  const actionableMissingCovers = useMemo(() => {
    return records.filter(
      (record) => !hasRealCover(record) && hasDiscogsId(record)
    ).length;
  }, [records]);

  const missingCoverRecords = useMemo(() => {
    return records.filter((record) => !hasRealCover(record));
  }, [records]);

  const missingDiscogsRecords = useMemo(() => {
    return records.filter((record) => !hasDiscogsId(record));
  }, [records]);

  const reviewRecords = useMemo(() => {
    return records.filter((record) => isReviewFlagged(record));
  }, [records]);

  const duplicateRecords = useMemo(() => {
    return records.filter((record) => record.possible_duplicate === true);
  }, [records]);

  const actionableFixRecords = useMemo(() => {
    return records.filter(
      (record) => !hasRealCover(record) && hasDiscogsId(record)
    );
  }, [records]);

  const visibleValueEstimate = useMemo(() => {
    return filteredRecords.reduce(
      (sum, record) => sum + getEstimatedValue(record),
      0
    );
  }, [filteredRecords]);

  const visiblePurchaseCost = useMemo(() => {
    return filteredRecords.reduce(
      (sum, record) => sum + getNumericValue(record.purchase_price),
      0
    );
  }, [filteredRecords]);

  const visibleValueGain = visibleValueEstimate - visiblePurchaseCost;

  const gradedVisibleCount = useMemo(() => {
    return filteredRecords.filter((record) => getPrimaryGrade(record)).length;
  }, [filteredRecords]);

  const visibleEbaySoldTotal = useMemo(() => {
    return filteredRecords.reduce(
      (sum, record) => sum + getNumericValue(record.ebay_last_sold_price),
      0
    );
  }, [filteredRecords]);

  const visibleDiscogsMedianTotal = useMemo(() => {
    return filteredRecords.reduce(
      (sum, record) => sum + getNumericValue(record.median_price),
      0
    );
  }, [filteredRecords]);

  const visibleConfidenceRollup = useMemo(() => {
    if (filteredRecords.length === 0) {
      return {
        totalScore: 0,
        averageScore: 0,
        highCount: 0,
        mediumCount: 0,
        lowOrUnknownCount: 0,
        confidenceWeightedValue: 0,
      };
    }

    return filteredRecords.reduce(
      (summary, record) => {
        const confidence = getRecordValueConfidence(record);
        const estimatedValue = getEstimatedValue(record);

        summary.totalScore += confidence.score;
        summary.confidenceWeightedValue += estimatedValue * (confidence.score / 100);

        if (confidence.label === "High") {
          summary.highCount += 1;
        } else if (confidence.label === "Medium") {
          summary.mediumCount += 1;
        } else {
          summary.lowOrUnknownCount += 1;
        }

        summary.averageScore = Math.round(summary.totalScore / filteredRecords.length);

        return summary;
      },
      {
        totalScore: 0,
        averageScore: 0,
        highCount: 0,
        mediumCount: 0,
        lowOrUnknownCount: 0,
        confidenceWeightedValue: 0,
      }
    );
  }, [filteredRecords]);

  return (
    <div className="space-y-8 bg-[#0E0C0A] text-[#F4EFE6]">
      <section className="overflow-hidden rounded-[34px] border border-[#3A3328] bg-[radial-gradient(circle_at_top_left,_rgba(199,164,93,0.16),_transparent_32%),linear-gradient(135deg,_#0E0C0A,_#17130F_58%,_#272017)] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-[#8F6F35]/45 bg-[#C7A45D]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C7A45D]">
              Collector Archive
            </div>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#F4EFE6] sm:text-4xl">
              Private Collection Registry
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#B8AA96]">
              A serious collector workspace for cataloging, validating,
              preserving, valuing, and refining your private record collection.
            </p>

            <p className="mt-3 text-sm text-[#B8AA96]">
              {formatStatNumber(totalCount)} total records •{" "}
              {formatStatNumber(filteredRecords.length)} visible in current view
              {" • "}
              {formatStatNumber(duplicateCount)} possible duplicates
            </p>
          </div>

          <div className="flex w-full max-w-xl flex-col gap-3">
            <input
              type="text"
              value={localSearchQuery}
              onChange={(event) => setLocalSearchQuery(event.target.value)}
              placeholder="Search artist, title, label, cat #..."
              className="w-full rounded-2xl border border-[#3A3328] bg-[#0E0C0A]/75 px-4 py-3 text-sm text-[#F4EFE6] outline-none placeholder:text-[#8E8170] focus:border-[#C7A45D]/70"
            />

            <div className="flex flex-wrap items-center gap-2">
              <AddRecordSlideOver
                showDuplicatesOnly={showDuplicatesOnly}
                setShowDuplicatesOnly={setShowDuplicatesOnly}
                duplicateCount={duplicateCount}
              />

              <Link
                href="/import"
                className="rounded-2xl border border-[#8F6F35]/50 bg-[#C7A45D]/10 px-4 py-3 text-sm font-semibold text-[#F4EFE6] transition hover:bg-[#C7A45D]/18"
              >
                Import Records
              </Link>

              <Link
                href="/collection/value-queue"
                className="rounded-2xl border border-[#8F6F35]/50 bg-[#C7A45D]/10 px-4 py-3 text-sm font-semibold text-[#F4EFE6] transition hover:bg-[#C7A45D]/18"
              >
                Value Queue
              </Link>

              <Link
                href="/collection/ebay-sold-comp-helper"
                className="rounded-2xl border border-emerald-400/45 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/18"
              >
                eBay Comp Helper
              </Link>

              <div className="flex items-center gap-2 rounded-2xl border border-[#3A3328] bg-[#0E0C0A]/60 px-4 py-3 text-sm text-[#D8CBB8]">
                <span className="h-2 w-2 rounded-full bg-[#7FA36B]" />
                Live local filter
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-7">
        <GlassStat label="Total" value={totalCount} tone="brass" />
        <GlassStat label="With Covers" value={totalWithCovers} tone="green" />
        <GlassStat label="Missing Covers" value={totalMissingCovers} tone="red" />
        <GlassStat label="Missing Discogs" value={missingDiscogsIdCount} tone="blue" />
        <GlassStat label="Review Queue" value={reviewQueueCount} tone="amber" />
        <GlassStat label="Duplicates" value={duplicateCount} tone="yellow" />
        <GlassStat label="Actionable" value={actionableMissingCovers} tone="copper" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ArchiveMetric
          label="Visible Value Estimate"
          value={formatMoney(visibleValueEstimate)}
          helper="Uses current value first, then Discogs median or high price when available."
        />

        <ArchiveMetric
          label="Purchase Cost"
          value={formatMoney(visiblePurchaseCost)}
          helper="Total purchase price for the records visible in the current filtered view."
        />

        <ArchiveMetric
          label="Estimated Gain / Loss"
          value={formatMoney(visibleValueGain)}
          helper="Current visible estimate minus recorded purchase cost."
        />

        <ArchiveMetric
          label="Discogs Median Roll-Up"
          value={formatMoney(visibleDiscogsMedianTotal)}
          helper="Total of available Discogs median values across the visible collection."
        />

        <ArchiveMetric
          label="eBay Sold Roll-Up"
          value={formatMoney(visibleEbaySoldTotal)}
          helper="Total of manually entered eBay last sold comparison values."
        />

        <ArchiveMetric
          label="Visible Graded Records"
          value={formatStatNumber(gradedVisibleCount)}
          helper="Records with media grade, condition, or extracted grade notes."
        />

        <ArchiveMetric
          label="Average Confidence"
          value={`${visibleConfidenceRollup.averageScore}/100`}
          helper="Average confidence score across the records visible in the current view."
        />

        <ArchiveMetric
          label="High-Confidence Records"
          value={formatStatNumber(visibleConfidenceRollup.highCount)}
          helper="Visible records with stronger market support from Discogs, eBay, or app values."
        />

        <ArchiveMetric
          label="Low / Unknown Confidence"
          value={formatStatNumber(visibleConfidenceRollup.lowOrUnknownCount)}
          helper="Visible records that need stronger pricing support before trusting the valuation."
        />

        <ArchiveMetric
          label="Confidence-Weighted Value"
          value={formatMoney(visibleConfidenceRollup.confidenceWeightedValue)}
          helper="Estimated visible value discounted by each record's confidence score."
        />
      </section>

      <section className="rounded-[28px] border border-[#3A3328] bg-[linear-gradient(180deg,_rgba(26,24,21,0.96),_rgba(14,12,10,0.94))] p-5 shadow-xl backdrop-blur-xl">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-[#B8AA96]">
          Workflow Presets
        </div>

        <div className="flex flex-wrap gap-2">
          {SAVED_VIEWS.map((view) => {
            const isActive = preset === view.value;
            const count = presetCounts[view.value] ?? 0;

            return (
              <Link
                key={view.value}
                href={buildCollectionHref({
                  preset: view.value,
                  sort,
                  searchQuery: localSearchQuery,
                })}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border border-[#C7A45D]/60 bg-gradient-to-r from-[#C7A45D] to-[#8F6F35] text-[#11100E] shadow-lg shadow-black/30"
                    : "border border-[#3A3328] bg-[#17130F] text-[#D8CBB8] hover:border-[#C7A45D]/45 hover:bg-[#2B261F]"
                }`}
              >
                {view.label} ({formatStatNumber(count)})
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setShowDuplicatesOnly((previous) => !previous)}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              showDuplicatesOnly
                ? "border border-yellow-300/40 bg-yellow-300 text-[#11100E] shadow-lg shadow-yellow-950/20"
                : "border border-[#8F6F35]/45 bg-[#C7A45D]/10 text-[#F4EFE6] hover:bg-[#C7A45D]/18"
            }`}
          >
            {showDuplicatesOnly
              ? `Showing Duplicates (${formatStatNumber(duplicateCount)})`
              : `Show Duplicates (${formatStatNumber(duplicateCount)})`}
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-[#3A3328] bg-[linear-gradient(180deg,_rgba(34,31,26,0.96),_rgba(17,16,14,0.92))] p-5 shadow-xl backdrop-blur-xl">
          <div className="text-xs font-semibold uppercase tracking-[0.32em] text-[#B8AA96]">
            Save Current View
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={savedViewName}
              onChange={(event) => setSavedViewName(event.target.value)}
              placeholder="Example: Bowie Cleanup"
              className="flex-1 rounded-2xl border border-[#3A3328] bg-[#0E0C0A]/70 px-4 py-3 text-sm text-[#F4EFE6] outline-none placeholder:text-[#8E8170] focus:border-[#C7A45D]/70"
            />

            <button
              type="button"
              disabled={isPending || savedViewName.trim() === ""}
              onClick={() => {
                setSavedViewMessage(null);

                startTransition(async () => {
                  try {
                    await createSavedView({
                      name: savedViewName,
                      preset,
                      sort,
                      searchQuery: localSearchQuery,
                    });

                    setSavedViewMessage(
                      "Saved view created. Refresh to see it in the list."
                    );
                    setSavedViewName("");
                  } catch (error) {
                    console.error("Create saved view failed:", error);
                    setSavedViewMessage(
                      "Failed to save view. Check terminal for details."
                    );
                  }
                });
              }}
              className="rounded-2xl bg-gradient-to-r from-[#C7A45D] to-[#8F6F35] px-5 py-3 text-sm font-semibold text-[#11100E] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save View"}
            </button>
          </div>

          {savedViewMessage && (
            <div className="mt-3 text-sm text-[#D8CBB8]">
              {savedViewMessage}
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-[#3A3328] bg-[linear-gradient(180deg,_rgba(34,31,26,0.96),_rgba(17,16,14,0.92))] p-5 shadow-xl backdrop-blur-xl">
          <div className="text-xs font-semibold uppercase tracking-[0.32em] text-[#B8AA96]">
            Custom Views
          </div>

          {savedViews.length === 0 ? (
            <div className="mt-4 text-sm text-[#B8AA96]">
              No custom saved views yet.
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {savedViews.map((view) => (
                <Link
                  key={view.id}
                  href={buildSavedViewHref(view)}
                  className="rounded-2xl border border-[#3A3328] bg-[#17130F] px-4 py-2 text-sm font-medium text-[#F4EFE6] transition hover:border-[#C7A45D]/45 hover:bg-[#2B261F]"
                >
                  {view.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-[#3A3328] bg-[linear-gradient(180deg,_rgba(26,24,21,0.96),_rgba(17,16,14,0.94))] p-5 shadow-xl backdrop-blur-xl">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-[#B8AA96]">
            Available Sorts
          </div>

          <div className="flex flex-wrap gap-2">
            {sortOptions.map((option) => (
              <Link
                key={option.value}
                href={buildCollectionHref({
                  preset,
                  sort: option.value,
                  searchQuery: localSearchQuery,
                })}
                className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                  sort === option.value
                    ? "border border-[#C7A45D]/40 bg-[#C7A45D]/12 text-[#F4EFE6]"
                    : "border border-[#3A3328] bg-[#17130F] text-[#D8CBB8]"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[#3A3328] bg-[linear-gradient(180deg,_rgba(26,24,21,0.96),_rgba(17,16,14,0.94))] p-5 shadow-xl backdrop-blur-xl">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-[#B8AA96]">
            Admin Toolbar
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-[#D8CBB8]">
              Active preset:{" "}
              <span className="font-semibold text-[#F4EFE6]">
                {SAVED_VIEWS.find((view) => view.value === preset)?.label ??
                  "All Records"}
              </span>
              {" • "}
              Showing {formatStatNumber(filteredRecords.length)} record
              {filteredRecords.length === 1 ? "" : "s"}
            </div>

            <div className="flex flex-wrap gap-2">
              <AddRecordSlideOver
                showDuplicatesOnly={showDuplicatesOnly}
                setShowDuplicatesOnly={setShowDuplicatesOnly}
                duplicateCount={duplicateCount}
              />

              <Link
                href="/import"
                className="rounded-2xl border border-[#8F6F35]/50 bg-[#C7A45D]/10 px-5 py-3 text-sm font-semibold text-[#F4EFE6] transition hover:bg-[#C7A45D]/18"
              >
                Import Records
              </Link>

              <Link
                href="/collection/value-queue"
                className="rounded-2xl border border-[#8F6F35]/50 bg-[#C7A45D]/10 px-5 py-3 text-sm font-semibold text-[#F4EFE6] transition hover:bg-[#C7A45D]/18"
              >
                Value Queue
              </Link>

              <Link
                href="/collection/ebay-sold-comp-helper"
                className="rounded-2xl border border-emerald-400/45 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/18"
              >
                eBay Comp Helper
              </Link>

              <Link
                href="/api/export/collection"
                className="rounded-2xl border border-[#3A3328] bg-[#221F1A]/70 px-5 py-3 text-sm font-semibold text-[#F4EFE6] transition hover:border-[#C7A45D]/45 hover:bg-[#2B261F]"
              >
                Export Full Collection
              </Link>

              <button
                type="button"
                disabled={isPending || actionableMissingCovers === 0}
                onClick={() => {
                  setBulkMessage(null);

                  startTransition(async () => {
                    try {
                      const result = (await bulkFixMissingCovers(25)) as BulkResult;

                      setBulkMessage(
                        `Batch complete — Fixed: ${result.fixed}, Failed: ${result.failed}, Skipped: ${result.skipped}, Remaining actionable: ${result.remainingActionable}`
                      );
                    } catch (error) {
                      console.error("Bulk cover fix failed:", error);
                      setBulkMessage(
                        "Bulk fix failed. Check terminal for details."
                      );
                    }
                  });
                }}
                className="rounded-2xl bg-gradient-to-r from-[#C7A45D] to-[#8F6F35] px-5 py-3 text-sm font-semibold text-[#11100E] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Running Batch..." : "Fix Missing Covers"}
              </button>
            </div>
          </div>

          {bulkMessage && (
            <div className="mt-4 rounded-2xl border border-[#3A3328] bg-[#0E0C0A]/60 px-4 py-3 text-sm text-[#D8CBB8]">
              {bulkMessage}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-[#3A3328] bg-[linear-gradient(180deg,_rgba(26,24,21,0.96),_rgba(17,16,14,0.94))] p-5 shadow-xl backdrop-blur-xl">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-[#B8AA96]">
          Export Exception Lists
        </div>

        <div className="flex flex-wrap gap-2">
          <ExportButton
            label={`Export Current View (${formatStatNumber(filteredRecords.length)})`}
            onClick={() =>
              downloadCsv(
                buildExportFilename("collection-current-view"),
                filteredRecords
              )
            }
            disabled={filteredRecords.length === 0}
          />

          <ExportButton
            label={`Export Missing Covers (${formatStatNumber(missingCoverRecords.length)})`}
            onClick={() =>
              downloadCsv(
                buildExportFilename("collection-missing-covers"),
                missingCoverRecords
              )
            }
            disabled={missingCoverRecords.length === 0}
          />

          <ExportButton
            label={`Export Missing Discogs IDs (${formatStatNumber(missingDiscogsRecords.length)})`}
            onClick={() =>
              downloadCsv(
                buildExportFilename("collection-missing-discogs-ids"),
                missingDiscogsRecords
              )
            }
            disabled={missingDiscogsRecords.length === 0}
          />

          <ExportButton
            label={`Export Needs Review (${formatStatNumber(reviewRecords.length)})`}
            onClick={() =>
              downloadCsv(
                buildExportFilename("collection-needs-review"),
                reviewRecords
              )
            }
            disabled={reviewRecords.length === 0}
          />

          <ExportButton
            label={`Export Possible Duplicates (${formatStatNumber(duplicateRecords.length)})`}
            onClick={() =>
              downloadCsv(
                buildExportFilename("collection-possible-duplicates"),
                duplicateRecords
              )
            }
            disabled={duplicateRecords.length === 0}
          />

          <ExportButton
            label={`Export Actionable Fixes (${formatStatNumber(actionableFixRecords.length)})`}
            onClick={() =>
              downloadCsv(
                buildExportFilename("collection-actionable-fixes"),
                actionableFixRecords
              )
            }
            disabled={actionableFixRecords.length === 0}
          />
        </div>
      </section>

      {filteredRecords.length === 0 ? (
        <section className="overflow-hidden rounded-[32px] border border-[#3A3328] bg-gradient-to-br from-[#0E0C0A] via-[#221F1A] to-[#0E0C0A] p-10 text-center shadow-2xl shadow-black/30">
          <div className="mx-auto max-w-xl">
            <div className="inline-flex rounded-full border border-[#8F6F35]/45 bg-[#C7A45D]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[#C7A45D]">
              No Results
            </div>

            <h3 className="mt-5 text-2xl font-semibold tracking-tight text-[#F4EFE6]">
              Nothing matches this view right now
            </h3>

            <p className="mt-3 text-sm leading-7 text-[#D8CBB8]">
              Try a different search, switch presets, clear duplicate-only mode,
              or return to the full archive.
            </p>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
          {filteredRecords.map((record) => {
            const hasCover = hasRealCover(record);
            const discogsPresent = hasDiscogsId(record);
            const reviewFlagged = isReviewFlagged(record);
            const duplicateFlagged = record.possible_duplicate === true;

            const recordId =
              record.id !== null && record.id !== undefined
                ? Number(record.id)
                : null;

            const isHighlighted =
              highlightedRecordId !== null &&
              record.id !== null &&
              record.id !== undefined &&
              highlightedRecordId === String(record.id);

            const detailHref =
              record.id != null
                ? `/collection/${record.id}?returnTo=${encodeURIComponent(
                    currentReturnPath
                  )}`
                : "/collection";

            const isWorkingThisCard = isPending && pendingId === recordId;

            const currentMatchQuery =
              recordId !== null
                ? matchQueries[recordId] ?? buildDefaultMatchQuery(record)
                : buildDefaultMatchQuery(record);

            const currentMatchResults =
              recordId !== null ? matchResults[recordId] ?? [] : [];

            const currentMatchStatus =
              recordId !== null ? matchStatus[recordId] ?? "" : "";

            const currentReviewReason =
              recordId !== null ? reviewReasons[recordId] ?? "" : "";

            return (
              <article
                key={String(record.id)}
                data-record-id={record.id ?? ""}
                className={`group overflow-hidden rounded-[32px] border shadow-2xl transition-all duration-700 hover:-translate-y-1 ${
                  isHighlighted
                    ? "scale-[1.015] ring-4 ring-[#C7A45D]/45 shadow-[#C7A45D]/30"
                    : ""
                } ${
                  duplicateFlagged
                    ? "border-[#C7A45D]/50 bg-[linear-gradient(145deg,_#302819,_#0E0C0A_45%,_#1B1712)] shadow-black/40"
                    : reviewFlagged
                      ? "border-[#C28A43]/45 bg-[linear-gradient(145deg,_#2A2117,_#0E0C0A_45%,_#1B1712)] shadow-black/40"
                      : !hasCover
                        ? "border-[#A85D4F]/45 bg-[linear-gradient(145deg,_#281715,_#0E0C0A_45%,_#1B1712)] shadow-black/40"
                        : "border-[#3A3328] bg-[linear-gradient(145deg,_#282218,_#0E0C0A_48%,_#1B1712)] shadow-black/40"
                }`}
              >
                <div className="border-b border-[#3A3328]/80 p-5">
                  <div className="flex items-start gap-5">
                    <div className="relative h-44 w-44 flex-shrink-0 overflow-hidden rounded-[26px] border border-[#3A3328] bg-[#0E0C0A]/80 shadow-2xl shadow-black/40">
                      {record.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={record.cover_url}
                          alt={`${record.artist ?? "Unknown Artist"} - ${
                            record.title ?? "Unknown Title"
                          }`}
                          className="h-full w-full object-cover opacity-95 transition duration-500 group-hover:scale-[1.035] group-hover:opacity-100"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2B261F] to-[#0E0C0A] px-4 text-center">
                          <div>
                            <div className="mx-auto mb-3 h-16 w-16 rounded-full border border-[#C7A45D]/25" />
                            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#B8AA96]">
                              No Cover
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />

                      <div className="absolute left-3 top-3 rounded-full border border-black/50 bg-black/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#F4EFE6] backdrop-blur">
                        {record.format || "Format"}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2">
                        {duplicateFlagged && (
                          <ArchiveBadge tone="yellow">
                            Possible Duplicate
                          </ArchiveBadge>
                        )}

                        {!hasCover && (
                          <ArchiveBadge tone="red">Missing Cover</ArchiveBadge>
                        )}

                        {hasCover && (
                          <ArchiveBadge tone="green">Cover Present</ArchiveBadge>
                        )}

                        {reviewFlagged && (
                          <ArchiveBadge tone="amber">Needs Review</ArchiveBadge>
                        )}

                        {record.sealed_status && (
                          <ArchiveBadge tone="brass">
                            Sealed: {record.sealed_status}
                          </ArchiveBadge>
                        )}

                        {isHighlighted && (
                          <ArchiveBadge tone="brass">Last Viewed</ArchiveBadge>
                        )}
                      </div>

                      <div className="mt-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C7A45D]">
                          {record.artist || "Unknown Artist"}
                        </div>

                        <h3 className="mt-2 line-clamp-2 text-2xl font-bold leading-tight tracking-tight text-[#F4EFE6]">
                          {record.title || "Untitled"}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-[#B8AA96]">
                          {[record.label, record.catalogue_number]
                            .filter(Boolean)
                            .join(" • ") || "Label details not cataloged"}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <MetaPill label="Year" value={record.year_released} />
                        <MetaPill label="Country" value={record.country} />
                        <MetaPill
                          label="Discogs ID"
                          value={record.discogs_release_id}
                        />
                        <MetaPill
                          label="Median"
                          value={formatMoney(record.median_price)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 border-b border-[#3A3328]/80 p-5 md:grid-cols-2">
                  <GradePanel record={record} />
                  <ValuePanel record={record} />
                </div>

                {!hasCover && (
                  <div className="border-b border-[#3A3328]/80 p-5">
                    <div className="rounded-[24px] border border-[#3A3328] bg-[#0E0C0A]/70 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#D6A090]">
                        Cover Triage
                      </div>

                      <div className="mt-2 text-sm leading-6 text-[#F4EFE6]">
                        {discogsPresent
                          ? "Discogs ID is present. This record is ready for a cover fetch."
                          : "No Discogs ID found. Search and assign a match first."}
                      </div>

                      {discogsPresent && recordId !== null ? (
                        <button
                          type="button"
                          disabled={isWorkingThisCard || isPending}
                          className="mt-4 rounded-xl bg-gradient-to-r from-[#C7A45D] to-[#8F6F35] px-4 py-2.5 text-xs font-bold text-[#11100E] transition hover:opacity-90 disabled:opacity-50"
                          onClick={() => {
                            setPendingId(recordId);
                            setBulkMessage(null);

                            startTransition(async () => {
                              try {
                                await fixCover(
                                  recordId,
                                  String(record.discogs_release_id)
                                );
                              } catch (error) {
                                console.error("Fix cover failed:", error);
                                alert(
                                  "Fix cover failed. Check terminal for details."
                                );
                              } finally {
                                setPendingId(null);
                              }
                            });
                          }}
                        >
                          {isWorkingThisCard ? "Fixing..." : "Fetch Cover Now"}
                        </button>
                      ) : recordId !== null ? (
                        <div className="mt-4 space-y-3">
                          <div>
                            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.25em] text-[#B8AA96]">
                              Search Discogs
                            </label>
                            <input
                              type="text"
                              value={currentMatchQuery}
                              onChange={(event) => {
                                setMatchQueries((previous) => ({
                                  ...previous,
                                  [recordId]: event.target.value,
                                }));
                              }}
                              placeholder="Artist title year"
                              className="w-full rounded-xl border border-[#3A3328] bg-[#0E0C0A]/85 px-3 py-2.5 text-sm text-[#F4EFE6] outline-none placeholder:text-[#8E8170] focus:border-[#C7A45D]/70"
                            />
                          </div>

                          <button
                            type="button"
                            disabled={isPending}
                            className="rounded-xl bg-gradient-to-r from-[#C7A45D] to-[#8F6F35] px-4 py-2.5 text-xs font-bold text-[#11100E] transition hover:opacity-90 disabled:opacity-50"
                            onClick={() => {
                              setPendingId(recordId);
                              setMatchStatus((previous) => ({
                                ...previous,
                                [recordId]: "Searching Discogs...",
                              }));

                              startTransition(async () => {
                                try {
                                  const results = await searchDiscogsMatches(
                                    currentMatchQuery,
                                    5
                                  );

                                  setMatchResults((previous) => ({
                                    ...previous,
                                    [recordId]: results,
                                  }));

                                  setMatchStatus((previous) => ({
                                    ...previous,
                                    [recordId]:
                                      results.length > 0
                                        ? `Found ${results.length} match${
                                            results.length === 1 ? "" : "es"
                                          }`
                                        : "No matches found.",
                                  }));
                                } catch (error) {
                                  console.error("Discogs search failed:", error);
                                  setMatchStatus((previous) => ({
                                    ...previous,
                                    [recordId]:
                                      "Discogs search failed. Check terminal for details.",
                                  }));
                                } finally {
                                  setPendingId(null);
                                }
                              });
                            }}
                          >
                            {isWorkingThisCard ? "Searching..." : "Search Matches"}
                          </button>

                          {currentMatchStatus && (
                            <div className="text-xs font-medium text-[#D8CBB8]">
                              {currentMatchStatus}
                            </div>
                          )}

                          {currentMatchResults.length > 0 && (
                            <div className="space-y-3">
                              {currentMatchResults.map((match) => (
                                <div
                                  key={`${recordId}-${match.id}`}
                                  className="rounded-[20px] border border-[#3A3328] bg-[#0E0C0A]/85 p-3"
                                >
                                  <div className="flex gap-3">
                                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-[#3A3328] bg-[#11100E]/60">
                                      {match.thumb ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={match.thumb}
                                          alt={match.title}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : null}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-semibold text-[#F4EFE6]">
                                        {match.title}
                                      </div>

                                      <div className="mt-1 text-xs leading-5 text-[#D8CBB8]">
                                        {[match.year, match.country, match.format]
                                          .filter(Boolean)
                                          .join(" • ") ||
                                          "Release details unavailable"}
                                      </div>

                                      {match.label && (
                                        <div className="mt-1 text-xs text-[#B8AA96]">
                                          Label: {match.label}
                                        </div>
                                      )}

                                      <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          disabled={isPending}
                                          className="rounded-xl bg-gradient-to-r from-[#C7A45D] to-[#8F6F35] px-3 py-1.5 text-xs font-bold text-[#11100E] transition hover:opacity-90 disabled:opacity-50"
                                          onClick={() => {
                                            setPendingId(recordId);
                                            setMatchStatus((previous) => ({
                                              ...previous,
                                              [recordId]:
                                                "Saving selected match...",
                                            }));

                                            startTransition(async () => {
                                              try {
                                                await saveDiscogsMatch(
                                                  recordId,
                                                  match.id,
                                                  match.uri
                                                );

                                                setMatchResults((previous) => ({
                                                  ...previous,
                                                  [recordId]: [],
                                                }));

                                                setMatchStatus((previous) => ({
                                                  ...previous,
                                                  [recordId]:
                                                    "Match saved. Cover refresh attempted.",
                                                }));
                                              } catch (error) {
                                                console.error(
                                                  "Saving Discogs match failed:",
                                                  error
                                                );
                                                setMatchStatus((previous) => ({
                                                  ...previous,
                                                  [recordId]:
                                                    "Save match failed. Check terminal for details.",
                                                }));
                                              } finally {
                                                setPendingId(null);
                                              }
                                            });
                                          }}
                                        >
                                          Use This Match
                                        </button>

                                        <button
                                          type="button"
                                          disabled={isPending}
                                          className="rounded-xl border border-[#C7A45D]/35 bg-[#C7A45D]/12 px-3 py-1.5 text-xs font-bold text-[#F4EFE6] transition hover:bg-[#C7A45D]/20 disabled:opacity-50"
                                          onClick={() => {
                                            setPendingId(recordId);

                                            startTransition(async () => {
                                              try {
                                                await setReviewFlag(
                                                  recordId,
                                                  `Ambiguous match candidate for ${
                                                    record.artist ||
                                                    "Unknown Artist"
                                                  } - ${
                                                    record.title || "Untitled"
                                                  }`
                                                );
                                              } catch (error) {
                                                console.error(
                                                  "Mark for review failed:",
                                                  error
                                                );
                                                alert(
                                                  "Mark for review failed. Check terminal for details."
                                                );
                                              } finally {
                                                setPendingId(null);
                                              }
                                            });
                                          }}
                                        >
                                          Mark for Review
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                <div className="border-b border-[#3A3328]/80 p-5">
                  <div className="rounded-[24px] border border-[#3A3328] bg-[#0E0C0A]/70 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C7A45D]">
                      Review Queue
                    </div>

                    <div className="mt-3 flex flex-col gap-2">
                      {recordId !== null && !reviewFlagged && (
                        <>
                          <input
                            type="text"
                            value={currentReviewReason}
                            onChange={(event) => {
                              setReviewReasons((previous) => ({
                                ...previous,
                                [recordId]: event.target.value,
                              }));
                            }}
                            placeholder="Reason for review (optional)"
                            className="w-full rounded-xl border border-[#3A3328] bg-[#0E0C0A]/85 px-3 py-2.5 text-sm text-[#F4EFE6] outline-none placeholder:text-[#8E8170] focus:border-[#C7A45D]/70"
                          />

                          <button
                            type="button"
                            disabled={isPending}
                            className="rounded-xl border border-[#C7A45D]/35 bg-[#C7A45D]/12 px-3 py-2.5 text-xs font-bold text-[#F4EFE6] transition hover:bg-[#C7A45D]/20 disabled:opacity-50"
                            onClick={() => {
                              setPendingId(recordId);

                              startTransition(async () => {
                                try {
                                  await setReviewFlag(
                                    recordId,
                                    currentReviewReason || undefined
                                  );
                                } catch (error) {
                                  console.error("Set review flag failed:", error);
                                  alert(
                                    "Set review flag failed. Check terminal for details."
                                  );
                                } finally {
                                  setPendingId(null);
                                }
                              });
                            }}
                          >
                            {isWorkingThisCard ? "Saving..." : "Mark for Review"}
                          </button>
                        </>
                      )}

                      {recordId !== null && reviewFlagged && (
                        <button
                          type="button"
                          disabled={isPending}
                          className="rounded-xl border border-[#3A3328] bg-[#221F1A]/70 px-3 py-2.5 text-xs font-bold text-[#F4EFE6] transition hover:bg-[#2B261F] disabled:opacity-50"
                          onClick={() => {
                            setPendingId(recordId);

                            startTransition(async () => {
                              try {
                                await clearReviewFlag(recordId);
                              } catch (error) {
                                console.error("Clear review flag failed:", error);
                                alert(
                                  "Clear review flag failed. Check terminal for details."
                                );
                              } finally {
                                setPendingId(null);
                              }
                            });
                          }}
                        >
                          {isWorkingThisCard ? "Clearing..." : "Clear Review"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoPanel
                      title="Release Details"
                      items={[
                        { label: "Format", value: record.format },
                        { label: "Label", value: record.label },
                        { label: "Cat #", value: record.catalogue_number },
                        { label: "Year", value: record.year_released },
                        { label: "Country", value: record.country },
                        {
                          label: "Median",
                          value: formatMoney(record.median_price),
                        },
                      ]}
                    />

                    <div className="rounded-[24px] border border-[#3A3328] bg-[#0E0C0A]/70 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C7A45D]">
                        Actions
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {record.id != null && (
                          <Link
                            href={detailHref}
                            onClick={() => {
                              sessionStorage.setItem(
                                `collection-scroll:${currentReturnPath}`,
                                String(window.scrollY)
                              );
                            }}
                            className="rounded-xl border border-[#8F6F35]/50 bg-[#C7A45D]/12 px-3 py-2 text-xs font-bold text-[#F4EFE6] transition hover:bg-[#C7A45D]/20"
                          >
                            View Details
                          </Link>
                        )}

                        {record.discogs_url && (
                          <a
                            href={record.discogs_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-[#8F6F35]/50 bg-[#C7A45D]/12 px-3 py-2 text-xs font-bold text-[#F4EFE6] transition hover:bg-[#C7A45D]/20"
                          >
                            Open Discogs
                          </a>
                        )}
                      </div>

                      {record.notes && (
                        <div className="mt-4 rounded-[18px] border border-[#3A3328] bg-[#090807]/90 p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#B8AA96]">
                            Notes
                          </div>

                          <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#F4EFE6]">
                            {record.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function ExportButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-2xl border border-[#3A3328] bg-[#221F1A]/70 px-4 py-2.5 text-sm font-semibold text-[#F4EFE6] transition hover:border-[#C7A45D]/45 hover:bg-[#2B261F] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function GlassStat({
  label,
  value,
  tone = "brass",
}: {
  label: string;
  value: number;
  tone?: "brass" | "green" | "red" | "blue" | "amber" | "copper" | "yellow";
}) {
  const toneClasses: Record<string, string> = {
    brass: "border-[#C7A45D]/30 bg-[#17130F] text-[#F4EFE6]",
    green: "border-[#7FA36B]/30 bg-[#17130F] text-[#F4EFE6]",
    red: "border-[#A85D4F]/30 bg-[#17130F] text-[#F4EFE6]",
    blue: "border-[#708EA3]/30 bg-[#17130F] text-[#F4EFE6]",
    amber: "border-[#C28A43]/30 bg-[#17130F] text-[#F4EFE6]",
    copper: "border-[#B56F3F]/30 bg-[#17130F] text-[#F4EFE6]",
    yellow: "border-yellow-300/25 bg-[#17130F] text-[#F4EFE6]",
  };

  return (
    <div
      className={`rounded-[24px] border px-4 py-4 shadow-lg shadow-black/25 backdrop-blur-xl ${toneClasses[tone]}`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#8E8170]">
        {label}
      </div>

      <div className="mt-2 text-3xl font-bold text-[#F4EFE6]">
        {formatStatNumber(value)}
      </div>
    </div>
  );
}

function ArchiveMetric({
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

function ArchiveBadge({
  children,
  tone = "brass",
}: {
  children: ReactNode;
  tone?: "brass" | "green" | "red" | "amber" | "yellow";
}) {
  const toneClasses: Record<string, string> = {
    brass: "border-[#C7A45D]/45 bg-[#C7A45D]/14 text-[#F4EFE6]",
    green: "border-[#7FA36B]/45 bg-[#7FA36B]/16 text-[#F4EFE6]",
    red: "border-[#A85D4F]/45 bg-[#A85D4F]/18 text-[#F4EFE6]",
    amber: "border-[#C28A43]/45 bg-[#C28A43]/18 text-[#F4EFE6]",
    yellow: "border-yellow-300/35 bg-yellow-300/18 text-yellow-100",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

function GradePanel({ record }: { record: CollectionRecord }) {
  const primaryGrade = getPrimaryGrade(record);
  const sleeveGrade = record.sleeve_grade || null;

  return (
    <div className="rounded-[24px] border border-[#3A3328] bg-[#0E0C0A]/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C7A45D]">
          Condition Registry
        </div>

        <span className="rounded-full border border-[#3A3328] bg-[#17130F] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[#B8AA96]">
          Grading
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <GradeBlock label="Media" value={primaryGrade} />
        <GradeBlock label="Sleeve" value={sleeveGrade} />
      </div>

      <p className="mt-3 text-xs leading-5 text-[#8E8170]">
        Future upgrade: dedicated Mint / Near Mint / VG+ / VG / Good / Fair /
        Poor grading fields.
      </p>
    </div>
  );
}

function GradeBlock({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-2xl border border-[#3A3328] bg-[#17130F]/80 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8E8170]">
        {label}
      </div>

      <div className="mt-2 text-xl font-bold text-[#F4EFE6]">
        {value && String(value).trim() !== "" ? value : "—"}
      </div>
    </div>
  );
}

function ValuePanel({ record }: { record: CollectionRecord }) {
  const estimatedValue = getEstimatedValue(record);
  const discogsMedian = getNumericValue(record.median_price);
  const ebayLastSold = getNumericValue(record.ebay_last_sold_price);
  const hasAnyValue = estimatedValue > 0 || discogsMedian > 0 || ebayLastSold > 0;

  const confidence = getRecordValueConfidence(record);

  return (
    <div className="rounded-[24px] border border-[#3A3328] bg-[#0E0C0A]/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C7A45D]">
          Value Intelligence
        </div>

        <span className="rounded-full border border-[#3A3328] bg-[#17130F] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[#B8AA96]">
          Market
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <ValueMini label="Discogs" value={formatMoney(record.median_price)} />
        <ValueMini
          label="eBay Sold"
          value={formatMoney(record.ebay_last_sold_price)}
        />
        <ValueMini label="Estimate" value={formatMoney(estimatedValue)} />
      </div>

      <div className="mt-4 rounded-2xl border border-[#3A3328] bg-[#17130F]/80 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8E8170]">
              Confidence
            </div>
            <div className="mt-1 text-lg font-bold text-[#F4EFE6]">
              {confidence.label}
            </div>
          </div>

          <div className="rounded-full border border-[#3A3328] bg-[#0E0C0A]/70 px-3 py-1 text-xs font-bold text-[#F4EFE6]">
            {confidence.score}/100
          </div>
        </div>

        <div className="mt-2 text-xs leading-5 text-[#B8AA96]">
          {confidence.sourceSummary}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#3A3328] bg-[#17130F]/80 p-3">
        <MiniValueSparkline active={hasAnyValue} />
      </div>
    </div>
  );
}

function ValueMini({ label, value }: { label: string; value: string }) {
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

function MiniValueSparkline({ active }: { active: boolean }) {
  if (!active) {
    return (
      <div className="flex h-12 items-center justify-center text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8E8170]">
        Awaiting market data
      </div>
    );
  }

  return (
    <svg viewBox="0 0 160 48" className="h-12 w-full">
      <polyline
        points="4,34 28,30 52,32 76,21 100,25 124,15 156,18"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-[#C7A45D]"
      />
      <circle cx="4" cy="34" r="3" className="fill-[#F4EFE6]" />
      <circle cx="76" cy="21" r="3" className="fill-[#F4EFE6]" />
      <circle cx="156" cy="18" r="3" className="fill-[#F4EFE6]" />
    </svg>
  );
}

function MetaPill({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-[#3A3328] bg-[#221F1A]/70 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B8AA96]">
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-semibold text-[#F4EFE6]">
        {value !== null && value !== undefined && String(value).trim() !== ""
          ? value
          : "—"}
      </div>
    </div>
  );
}

function InfoPanel({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: string | number | null | undefined }[];
}) {
  return (
    <div className="rounded-[24px] border border-[#3A3328] bg-[#0E0C0A]/70 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C7A45D]">
        {title}
      </div>

      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-start justify-between gap-4 border-b border-[#3A3328]/70 pb-2 text-sm last:border-b-0 last:pb-0"
          >
            <span className="font-medium text-[#B8AA96]">{item.label}</span>
            <span className="text-right font-semibold text-[#F4EFE6]">
              {item.value !== null &&
              item.value !== undefined &&
              String(item.value).trim() !== ""
                ? item.value
                : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}