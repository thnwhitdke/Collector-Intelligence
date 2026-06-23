"use client";

import { useState } from "react";

export default function UpgradeButtons({
  collectorPriceId,
  founderPriceId,
}: {
  collectorPriceId: string;
  founderPriceId: string;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(priceId: string, label: string) {
    try {
      setLoading(label);
      setError(null);

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(data.error ?? "Unable to start checkout.");
        return;
      }

      window.location.assign(data.url);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <button
        type="button"
        onClick={() => startCheckout(collectorPriceId, "collector")}
        className="w-full rounded-xl bg-amber-300 px-5 py-3 font-black text-slate-950"
      >
        {loading === "collector" ? "Opening Stripe..." : "Upgrade to Collector — $4.99/mo"}
      </button>

      <button
        type="button"
        onClick={() => startCheckout(founderPriceId, "founder")}
        className="w-full rounded-xl border border-amber-300/40 px-5 py-3 font-black text-amber-300"
      >
        {loading === "founder" ? "Opening Stripe..." : "Founder — $49/year"}
      </button>

      {error && (
        <p className="rounded-xl border border-red-900/70 bg-red-950/40 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}
