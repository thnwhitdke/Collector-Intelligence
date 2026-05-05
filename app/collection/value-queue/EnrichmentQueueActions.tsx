"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  pullBatchDiscogsValues,
  pullBatchMissingCovers,
} from "../../actions/value-queue";

type ValueResultRecord = {
  id: string;
  artist: string;
  title: string;
  releaseId: string;
  low: number | null;
  median: number | null;
  high: number | null;
  forSale: number | null;
  lastSoldDate: string | null;
};

type CoverResultRecord = {
  id: string;
  artist: string | null;
  title: string | null;
  coverUrl: string;
};

type ValuePullResult = {
  ok: boolean;
  message: string;
  updated: number;
  skipped: number;
  failed: number;
  markedUnavailable: number;
  pulledRecords: ValueResultRecord[];
};

type CoverPullResult = {
  ok: boolean;
  message: string;
  updated: number;
  skipped: number;
  failed: number;
  updatedRecords?: CoverResultRecord[];
};

function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function EnrichmentQueueActions() {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<"values" | "covers" | null>(
    null,
  );

  const [valueResult, setValueResult] = useState<ValuePullResult | null>(null);
  const [coverResult, setCoverResult] = useState<CoverPullResult | null>(null);

  const pullingValues = isPending && activeAction === "values";
  const pullingCovers = isPending && activeAction === "covers";

  function runValuePull() {
    setActiveAction("values");

    startTransition(async () => {
      const result = await pullBatchDiscogsValues(10);

      setValueResult(result as ValuePullResult);
      setActiveAction(null);

      router.refresh();
    });
  }

  function runCoverPull() {
    setActiveAction("covers");

    startTransition(async () => {
      const result = await pullBatchMissingCovers(10);

      setCoverResult(result as CoverPullResult);
      setActiveAction(null);

      router.refresh();
    });
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[28px] border border-[#3A3328] bg-[linear-gradient(145deg,_#211B14,_#0E0C0A)] p-5 shadow-xl shadow-black/25">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C7A45D]">
            Value Pull
          </div>

          <h2 className="mt-3 text-2xl font-bold text-[#F4EFE6]">
            Pull Discogs values
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#B8AA96]">
            Pulls low, median, high, estimated value, Discogs sale count, and
            last sold date for eligible records.
          </p>

          <button
            type="button"
            onClick={runValuePull}
            disabled={isPending}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#C7A45D] to-[#8F6F35] px-5 py-3 text-sm font-bold text-[#11100E] shadow-lg shadow-black/30 transition hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pullingValues
              ? "Pulling values… please keep this page open"
              : "Pull Next 10 Values"}
          </button>

          {pullingValues && (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#17130F]">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-[#C7A45D]" />
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-[#3A3328] bg-[linear-gradient(145deg,_#211B14,_#0E0C0A)] p-5 shadow-xl shadow-black/25">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C7A45D]">
            Cover Recovery
          </div>

          <h2 className="mt-3 text-2xl font-bold text-[#F4EFE6]">
            Pull missing album art
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#B8AA96]">
            Pulls missing cover images from Discogs for records that already
            have a usable Discogs release ID.
          </p>

          <button
            type="button"
            onClick={runCoverPull}
            disabled={isPending}
            className="mt-5 w-full rounded-2xl border border-[#C7A45D]/60 bg-[#17130F] px-5 py-3 text-sm font-bold text-[#F4EFE6] shadow-lg shadow-black/30 transition hover:scale-[1.01] hover:bg-[#C7A45D]/18 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pullingCovers
              ? "Pulling covers… please keep this page open"
              : "Pull Next 10 Covers"}
          </button>

          {pullingCovers && (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#17130F]">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-[#C7A45D]" />
            </div>
          )}
        </div>
      </div>

      {valueResult && (
        <div className="rounded-[28px] border border-[#3A3328] bg-[#17130F]/90 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C7A45D]">
                Value Pull Results
              </div>

              <p className="mt-2 text-sm font-semibold text-[#F4EFE6]">
                {valueResult.message}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <ResultPill label="Updated" value={valueResult.updated} />
              <ResultPill label="Skipped" value={valueResult.skipped} />
              <ResultPill
                label="Unavailable"
                value={valueResult.markedUnavailable}
              />
              <ResultPill label="Failed" value={valueResult.failed} />
            </div>
          </div>

          {valueResult.pulledRecords.length > 0 && (
            <div className="mt-5 space-y-3">
              {valueResult.pulledRecords.map((record) => (
                <div
                  key={record.id}
                  className="rounded-2xl border border-[#3A3328] bg-[#0E0C0A]/75 p-4"
                >
                  <div className="text-sm font-bold text-[#F4EFE6]">
                    {record.artist} — {record.title}
                  </div>

                  <div className="mt-2 grid gap-2 text-xs text-[#B8AA96] sm:grid-cols-4">
                    <span>Low: {money(record.low)}</span>
                    <span>Median: {money(record.median)}</span>
                    <span>High: {money(record.high)}</span>
                    <span>Discogs #{record.releaseId}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {coverResult && (
        <div className="rounded-[28px] border border-[#3A3328] bg-[#17130F]/90 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C7A45D]">
                Cover Pull Results
              </div>

              <p className="mt-2 text-sm font-semibold text-[#F4EFE6]">
                {coverResult.message}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <ResultPill label="Updated" value={coverResult.updated} />
              <ResultPill label="Skipped" value={coverResult.skipped} />
              <ResultPill label="Failed" value={coverResult.failed} />
            </div>
          </div>

          {(coverResult.updatedRecords ?? []).length > 0 && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {(coverResult.updatedRecords ?? []).map((record) => (
                <div
                  key={record.id}
                  className="rounded-2xl border border-[#3A3328] bg-[#0E0C0A]/75 p-3"
                >
                  <div className="aspect-square overflow-hidden rounded-xl border border-[#3A3328] bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={record.coverUrl}
                      alt={`${record.artist ?? "Unknown Artist"} - ${
                        record.title ?? "Untitled"
                      }`}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="mt-3 text-xs font-bold text-[#F4EFE6]">
                    {record.artist || "Unknown Artist"}
                  </div>

                  <div className="mt-1 line-clamp-2 text-xs text-[#B8AA96]">
                    {record.title || "Untitled"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ResultPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#3A3328] bg-[#0E0C0A]/80 px-3 py-2">
      <div className="text-lg font-bold text-[#F4EFE6]">{value}</div>

      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8E8170]">
        {label}
      </div>
    </div>
  );
}