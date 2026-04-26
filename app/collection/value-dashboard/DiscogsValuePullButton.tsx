"use client";

import { useState, useTransition } from "react";
import { pullDiscogsValuesBatch } from "@/app/actions/discogs-values";

export default function DiscogsValuePullButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);

    startTransition(async () => {
      const result = await pullDiscogsValuesBatch();
      setMessage(result.message);
    });
  }

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

      {message ? (
        <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200">
          {message}
        </div>
      ) : null}
    </div>
  );
}