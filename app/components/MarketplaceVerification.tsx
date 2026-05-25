"use client";

import { useState } from "react";

type MarketplaceVerificationProps = {
  recordId: string;
  releaseId: string;
};

export default function MarketplaceVerification({
  recordId,
  releaseId,
}: MarketplaceVerificationProps) {
  const [forSale, setForSale] = useState("");
  const [lowestPrice, setLowestPrice] = useState("");
  const [marketNote, setMarketNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(
        "/api/marketplace/psmi",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recordId,
            forSale:
              forSale.trim() === ""
                ? null
                : Number(forSale),
            lowestPrice:
              lowestPrice.trim() === ""
                ? null
                : Number(lowestPrice),
            marketNote,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(
          result.error || "Save failed."
        );
        return;
      }

      setMessage(
        "Exact market saved successfully."
      );
    } catch (error) {
      console.error(error);
      setMessage(
        "Unable to save exact market."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 space-y-4">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-cyan-400">
          Pressing-Specific Market Intelligence
        </div>

        <h3 className="mt-1 text-xl font-semibold text-white">
          Exact Market Verification
        </h3>

        <p className="mt-1 text-sm text-zinc-400">
          Verify this exact pressing directly
          from Discogs marketplace results.
        </p>
      </div>

      <a
        href={`https://www.discogs.com/sell/release/${releaseId}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
      >
        Open Exact Discogs Market
      </a>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-400">
            Copies For Sale
          </label>

          <input
            type="number"
            value={forSale}
            onChange={(e) =>
              setForSale(e.target.value)
            }
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white"
            placeholder="0"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400">
            Lowest Exact Price
          </label>

          <input
            type="number"
            step="0.01"
            value={lowestPrice}
            onChange={(e) =>
              setLowestPrice(
                e.target.value
              )
            }
            className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white"
            placeholder="0.00"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-zinc-400">
          Market Notes
        </label>

        <textarea
          value={marketNote}
          onChange={(e) =>
            setMarketNote(
              e.target.value
            )
          }
          className="mt-1 min-h-[90px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white"
          placeholder="No active exact market, rare promo, unique listing pattern, etc."
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-xl bg-amber-500 px-4 py-2 font-medium text-black hover:bg-amber-400 disabled:opacity-50"
      >
        {saving
          ? "Saving..."
          : "Save Exact Market"}
      </button>

      {message ? (
        <div className="text-sm text-zinc-300">
          {message}
        </div>
      ) : null}
    </div>
  );
}