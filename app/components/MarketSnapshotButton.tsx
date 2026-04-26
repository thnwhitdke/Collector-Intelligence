"use client";

import { useState, useTransition } from "react";
import { pullDiscogsMarketSnapshot } from "@/app/actions/market-snapshot";

export default function MarketSnapshotButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);

    startTransition(async () => {
      const result = await pullDiscogsMarketSnapshot(10);
      setMessage(result.message);
    });
  }

  return (
    <div className="rounded-3xl border border-cyan-400/20 bg-slate-900 p-4">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:opacity-90"
      >
        {isPending ? "Pulling Market Snapshot..." : "📊 Pull Market Snapshot"}
      </button>

      {message && (
        <p className="mt-3 text-sm text-slate-300">{message}</p>
      )}
    </div>
  );
}