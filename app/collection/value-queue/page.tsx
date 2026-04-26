import Link from "next/link";
import { createClient } from "../../../src/lib/supabase/server";
import { calculateValueConfidence } from "../../../src/lib/value-confidence";
import type { CollectionRecord } from "../ui";

type QueueRecord = {
  record: CollectionRecord;
  estimatedValue: number;
  confidenceScore: number;
  confidenceLabel: string;
  sourceSummary: string;
  missingEbayData: boolean;
  missingDiscogsValue: boolean;
  highValueLowConfidence: boolean;
  priorityScore: number;
  priorityLabel: "Critical" | "High" | "Medium" | "Low";
  reasons: string[];
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
    getNumericValue(record.high_price) ||
    getNumericValue(record.ebay_median_sold_price) ||
    getNumericValue(record.ebay_last_sold_price)
  );
}

function getRecordConfidence(record: CollectionRecord) {
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

function buildQueueRecord(record: CollectionRecord): QueueRecord {
  const confidence = getRecordConfidence(record);
  const estimatedValue = getEstimatedValue(record);

  const ebayLastSold = getNumericValue(record.ebay_last_sold_price);
  const ebayMedian = getNumericValue(record.ebay_median_sold_price);
  const ebayLow = getNumericValue(record.ebay_low_sold_price);
  const ebayHigh = getNumericValue(record.ebay_high_sold_price);
  const ebayCompCount = getNumericValue(record.ebay_sold_comp_count);

  const discogsMedian = getNumericValue(record.median_price);
  const discogsLow = getNumericValue(record.low_price);
  const discogsHigh = getNumericValue(record.high_price);

  const missingEbayData =
    ebayLastSold === 0 &&
    ebayMedian === 0 &&
    ebayLow === 0 &&
    ebayHigh === 0 &&
    ebayCompCount === 0;

  const missingDiscogsValue =
    discogsMedian === 0 && discogsLow === 0 && discogsHigh === 0;

  const highValueLowConfidence = estimatedValue >= 75 && confidence.score < 60;

  const reasons: string[] = [];

  if (confidence.score < 40) {
    reasons.push("Very low value confidence");
  } else if (confidence.score < 60) {
    reasons.push("Moderate-to-low confidence");
  }

  if (missingEbayData) {
    reasons.push("Missing eBay sold-comp data");
  }

  if (missingDiscogsValue) {
    reasons.push("Missing Discogs value support");
  }

  if (highValueLowConfidence) {
    reasons.push("Potentially valuable record needs verification");
  }

  if (estimatedValue === 0) {
    reasons.push("No usable value estimate yet");
  }

  let priorityScore = 0;

  priorityScore += 100 - confidence.score;

  if (missingEbayData) {
    priorityScore += 30;
  }

  if (missingDiscogsValue) {
    priorityScore += 20;
  }

  if (highValueLowConfidence) {
    priorityScore += 35;
  }

  if (estimatedValue === 0) {
    priorityScore += 25;
  }

  if (estimatedValue >= 150) {
    priorityScore += 20;
  } else if (estimatedValue >= 75) {
    priorityScore += 10;
  }

  let priorityLabel: QueueRecord["priorityLabel"] = "Low";

  if (priorityScore >= 125) {
    priorityLabel = "Critical";
  } else if (priorityScore >= 95) {
    priorityLabel = "High";
  } else if (priorityScore >= 65) {
    priorityLabel = "Medium";
  }

  return {
    record,
    estimatedValue,
    confidenceScore: confidence.score,
    confidenceLabel: confidence.label,
    sourceSummary: confidence.sourceSummary,
    missingEbayData,
    missingDiscogsValue,
    highValueLowConfidence,
    priorityScore,
    priorityLabel,
    reasons,
  };
}

function shouldAppearInQueue(item: QueueRecord) {
  return (
    item.confidenceScore < 75 ||
    item.missingEbayData ||
    item.missingDiscogsValue ||
    item.highValueLowConfidence
  );
}

function priorityTone(priority: QueueRecord["priorityLabel"]) {
  switch (priority) {
    case "Critical":
      return "border-red-400/40 bg-red-400/10 text-red-100";
    case "High":
      return "border-orange-300/40 bg-orange-300/10 text-orange-100";
    case "Medium":
      return "border-yellow-300/40 bg-yellow-300/10 text-yellow-100";
    case "Low":
    default:
      return "border-[#3A3328] bg-[#17130F] text-[#D8CBB8]";
  }
}

function confidenceTone(label: string) {
  switch (label) {
    case "High":
      return "border-[#7FA36B]/45 bg-[#7FA36B]/15 text-[#F4EFE6]";
    case "Medium":
      return "border-[#C7A45D]/45 bg-[#C7A45D]/15 text-[#F4EFE6]";
    case "Low":
      return "border-[#C28A43]/45 bg-[#C28A43]/15 text-[#F4EFE6]";
    case "Unknown":
    default:
      return "border-[#A85D4F]/45 bg-[#A85D4F]/15 text-[#F4EFE6]";
  }
}

export default async function ValueQueuePage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("records_clean_safe")
    .select("*")
    .order("id", { ascending: false })
    .limit(1000);

  const records = (data ?? []) as CollectionRecord[];

  const queue = records
    .map(buildQueueRecord)
    .filter(shouldAppearInQueue)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 250);

  const criticalCount = queue.filter(
    (item) => item.priorityLabel === "Critical",
  ).length;

  const highCount = queue.filter((item) => item.priorityLabel === "High").length;

  const missingEbayCount = queue.filter((item) => item.missingEbayData).length;

  const highValueLowConfidenceCount = queue.filter(
    (item) => item.highValueLowConfidence,
  ).length;

  const totalQueueValue = queue.reduce(
    (sum, item) => sum + item.estimatedValue,
    0,
  );

  return (
    <main className="min-h-screen bg-[#0E0C0A] px-6 py-8 text-[#F4EFE6]">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[34px] border border-[#3A3328] bg-[radial-gradient(circle_at_top_left,_rgba(199,164,93,0.16),_transparent_32%),linear-gradient(135deg,_#0E0C0A,_#17130F_58%,_#272017)] p-6 shadow-2xl shadow-black/40">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-[#8F6F35]/45 bg-[#C7A45D]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C7A45D]">
                Value Pull Queue
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Records Needing Market Verification
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#B8AA96]">
                This queue automatically prioritizes records with weak valuation
                confidence, missing eBay sold-comp data, missing Discogs value
                support, or potentially valuable records that need stronger
                market confirmation.
              </p>

              {error && (
                <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                  Supabase warning: {error.message}
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
                href="/collection?preset=needs_verification"
                className="rounded-2xl bg-gradient-to-r from-[#C7A45D] to-[#8F6F35] px-5 py-3 text-sm font-semibold text-[#11100E] transition hover:opacity-90"
              >
                Needs Verification View
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <QueueMetric
            label="Queue Records"
            value={formatNumber(queue.length)}
            helper="Records currently needing value work."
          />

          <QueueMetric
            label="Critical Priority"
            value={formatNumber(criticalCount)}
            helper="Highest urgency value verification items."
          />

          <QueueMetric
            label="High Priority"
            value={formatNumber(highCount)}
            helper="Important records needing stronger support."
          />

          <QueueMetric
            label="Missing eBay Data"
            value={formatNumber(missingEbayCount)}
            helper="Records without sold-comp support yet."
          />

          <QueueMetric
            label="Queue Value"
            value={formatMoney(totalQueueValue)}
            helper="Estimated value represented in this work queue."
          />
        </section>

        <section className="rounded-[28px] border border-[#3A3328] bg-[linear-gradient(180deg,_rgba(26,24,21,0.96),_rgba(17,16,14,0.94))] p-5 shadow-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.32em] text-[#B8AA96]">
                Queue Logic
              </div>

              <p className="mt-2 text-sm leading-6 text-[#D8CBB8]">
                The app ranks records by confidence score, missing market data,
                and estimated value risk. High-value records with low confidence
                are pushed upward so you can verify the most important items
                first.
              </p>
            </div>

            <div className="rounded-2xl border border-[#C7A45D]/35 bg-[#C7A45D]/10 px-4 py-3 text-sm font-semibold text-[#F4EFE6]">
              {formatNumber(highValueLowConfidenceCount)} high-value / low-confidence
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
                No records need value verification right now
              </h2>

              <p className="mt-3 text-sm leading-7 text-[#D8CBB8]">
                Your visible dataset currently has enough market support based
                on the queue rules.
              </p>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            {queue.map((item) => {
              const record = item.record;

              const recordHref =
                record.id !== null && record.id !== undefined
                  ? `/collection/${record.id}?returnTo=${encodeURIComponent(
                      "/collection/value-queue",
                    )}`
                  : "/collection/value-queue";

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
                            item.priorityLabel,
                          )}`}
                        >
                          {item.priorityLabel} Priority
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${confidenceTone(
                            item.confidenceLabel,
                          )}`}
                        >
                          {item.confidenceLabel} Confidence
                        </span>

                        {item.missingEbayData && (
                          <span className="rounded-full border border-[#A85D4F]/45 bg-[#A85D4F]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#F4EFE6]">
                            Missing eBay
                          </span>
                        )}

                        {item.highValueLowConfidence && (
                          <span className="rounded-full border border-[#C7A45D]/45 bg-[#C7A45D]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#F4EFE6]">
                            Value Risk
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
                        <QueueMini label="Estimate" value={formatMoney(item.estimatedValue)} />
                        <QueueMini label="Discogs" value={formatMoney(record.median_price)} />
                        <QueueMini
                          label="eBay Last"
                          value={formatMoney(record.ebay_last_sold_price)}
                        />
                        <QueueMini
                          label="eBay Median"
                          value={formatMoney(record.ebay_median_sold_price)}
                        />
                      </div>

                      {item.reasons.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.reasons.map((reason) => (
                            <span
                              key={reason}
                              className="rounded-full border border-[#3A3328] bg-[#17130F]/80 px-3 py-1 text-xs text-[#D8CBB8]"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-[24px] border border-[#3A3328] bg-[#0E0C0A]/70 p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8E8170]">
                        Priority Score
                      </div>

                      <div className="mt-2 text-4xl font-bold text-[#F4EFE6]">
                        {item.priorityScore}
                      </div>

                      <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8E8170]">
                        Confidence
                      </div>

                      <div className="mt-2 text-xl font-bold text-[#F4EFE6]">
                        {item.confidenceScore}/100
                      </div>

                      <p className="mt-3 text-xs leading-5 text-[#B8AA96]">
                        {item.sourceSummary}
                      </p>

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
                          Search in Collection
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