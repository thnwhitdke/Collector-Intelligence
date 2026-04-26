"use client";

import { useState, useTransition } from "react";
import { pullBatchDiscogsValues } from "@/app/actions/value-queue";

type PulledRecord = {
  id: string;
  artist: string;
  title: string;
  releaseId: string;
  low: number | null;
  median: number | null;
  high: number | null;
};

type PullResult = {
  ok: boolean;
  message: string;
  updated: number;
  skipped: number;
  failed: number;
  pulledRecords?: PulledRecord[];
};

function currency(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function DiscogsValuePullButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<PullResult | null>(null);

  function handleClick() {
    setResult(null);

    startTransition(async () => {
      const nextResult = await pullBatchDiscogsValues(10);
      setResult(nextResult);
    });
  }

  const pulledRecords = result?.pulledRecords ?? [];

  return (
    <div className="rounded-3xl border border-amber-200/20 bg-slate-950/80 p-5 shadow-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">
            Discogs Value Engine
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-50">
            One-Click Discogs Value Pull
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Pulls a small controlled batch of Discogs marketplace value data and
            updates estimated values for records that still need valuation.
          </p>
        </div>

        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="rounded-2xl border border-amber-300/40 bg-amber-300 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Pulling values..." : "Pull Discogs Values"}
        </button>
      </div>

      {result ? (
        <div className="mt-4 space-y-4 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200">
          <p>{result.message}</p>

          {pulledRecords.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
                Records Updated This Run
              </p>

              <div className="space-y-2">
                {pulledRecords.map((record, index) => (
                  <div
                    key={`${record.id}-${record.releaseId}`}
                    className="rounded-2xl border border-slate-700 bg-slate-950/80 p-3"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-slate-100">
                          {index + 1}. {record.artist}
                        </p>
                        <p className="text-slate-400">{record.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Discogs Release ID: {record.releaseId}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-right text-xs">
                        <div>
                          <p className="uppercase tracking-[0.15em] text-slate-500">
                            Low
                          </p>
                          <p className="mt-1 font-bold text-slate-200">
                            {currency(record.low)}
                          </p>
                        </div>

                        <div>
                          <p className="uppercase tracking-[0.15em] text-slate-500">
                            Median
                          </p>
                          <p className="mt-1 font-bold text-amber-200">
                            {currency(record.median)}
                          </p>
                        </div>

                        <div>
                          <p className="uppercase tracking-[0.15em] text-slate-500">
                            High
                          </p>
                          <p className="mt-1 font-bold text-slate-200">
                            {currency(record.high)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Refresh the page if the table below does not immediately show
                the newly updated values.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}