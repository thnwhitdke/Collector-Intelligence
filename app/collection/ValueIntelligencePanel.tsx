// app/collection/ValueIntelligencePanel.tsx

"use client";

import { useTransition, useState } from "react";
import { pullAndSaveDiscogsValue } from "../actions/value-intelligence";

type ValueIntelligencePanelProps = {
  recordId: string;
  discogsReleaseId: string | null;
  purchasePrice: number | null;
  estimatedValue: number | null;
  lowPrice: number | null;
  medianPrice: number | null;
  highPrice: number | null;
  valueLastUpdated: string | null;
};

function money(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "Never pulled";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function ValueIntelligencePanel({
  recordId,
  discogsReleaseId,
  purchasePrice,
  estimatedValue,
  lowPrice,
  medianPrice,
  highPrice,
  valueLastUpdated,
}: ValueIntelligencePanelProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const delta =
    estimatedValue !== null && purchasePrice !== null
      ? estimatedValue - purchasePrice
      : null;

  const deltaLabel =
    delta === null
      ? "—"
      : `${delta >= 0 ? "+" : ""}${money(Number(delta.toFixed(2)))}`;

  function handlePullValue() {
    setMessage(null);

    startTransition(async () => {
      const result = await pullAndSaveDiscogsValue(recordId);
      setMessage(result.message);

      if (result.ok) {
        window.location.reload();
      }
    });
  }

  return (
    <section className="rounded-[2rem] border border-stone-300/70 bg-[#f7f1e8] p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 border-b border-stone-300 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            Value Intelligence
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">
            Discogs Market Estimate
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Last updated: {formatDate(valueLastUpdated)}
          </p>
        </div>

        <button
          type="button"
          onClick={handlePullValue}
          disabled={isPending || !discogsReleaseId}
          className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {isPending ? "Pulling Discogs value..." : "Pull Discogs Value"}
        </button>
      </div>

      {!discogsReleaseId ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Add or match a Discogs release ID before pulling value intelligence.
        </div>
      ) : null}

      {message ? (
        <div className="mb-4 rounded-2xl border border-stone-300 bg-white/70 p-3 text-sm text-stone-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-3xl border border-stone-300 bg-white/75 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            Low
          </p>
          <p className="mt-2 text-2xl font-semibold text-stone-950">
            {money(lowPrice)}
          </p>
        </div>

        <div className="rounded-3xl border border-stone-300 bg-white/75 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            Median
          </p>
          <p className="mt-2 text-2xl font-semibold text-stone-950">
            {money(medianPrice)}
          </p>
        </div>

        <div className="rounded-3xl border border-stone-300 bg-white/75 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            High
          </p>
          <p className="mt-2 text-2xl font-semibold text-stone-950">
            {money(highPrice)}
          </p>
        </div>

        <div className="rounded-3xl border border-stone-950 bg-stone-950 p-4 text-stone-50">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-300">
            Gain / Loss
          </p>
          <p className="mt-2 text-2xl font-semibold">{deltaLabel}</p>
          <p className="mt-1 text-xs text-stone-300">
            Compared with purchase price
          </p>
        </div>
      </div>
    </section>
  );
}