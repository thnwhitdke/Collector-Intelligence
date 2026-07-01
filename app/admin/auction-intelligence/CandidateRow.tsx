"use client";

import { useTransition } from "react";
import { reviewAuctionCandidate } from "./actions";

export default function CandidateRow({ candidate }: { candidate: any }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex justify-between gap-6">
        <div className="flex-1">
          <div className="text-sm text-gray-400">
            Record #{candidate.record_id}
          </div>

          <div className="mt-2 text-xl font-bold">
            {candidate.auction_title ?? "Untitled Auction"}
          </div>

          <div className="mt-2 text-sm text-gray-400 break-all">
            {candidate.source_record_url}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-white/10 px-2 py-1">
              Score {candidate.variant_score}
            </span>

            {candidate.catalog_match && (
              <span className="rounded bg-green-700 px-2 py-1">Catalog</span>
            )}

            {candidate.demo_match && (
              <span className="rounded bg-green-700 px-2 py-1">Demo</span>
            )}

            {candidate.reissue_flag && (
              <span className="rounded bg-red-700 px-2 py-1">Reissue</span>
            )}

            {candidate.without_center_flag && (
              <span className="rounded bg-red-700 px-2 py-1">
                Without Center
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-yellow-300">
            ${Number(candidate.sale_price_usd ?? candidate.sale_price).toLocaleString()}
          </div>

          <div className="text-xs text-gray-400">
            {candidate.original_currency} {candidate.original_sale_price}
          </div>

          <div className="mt-6 flex gap-2">
            <button
              disabled={pending}
              onClick={() =>
                startTransition(() =>
                  reviewAuctionCandidate(candidate.id, "accepted")
                )
              }
              className="rounded bg-green-700 px-4 py-2 font-bold hover:bg-green-600"
            >
              ✓ Accept
            </button>

            <button
              disabled={pending}
              onClick={() =>
                startTransition(() =>
                  reviewAuctionCandidate(candidate.id, "rejected")
                )
              }
              className="rounded bg-red-700 px-4 py-2 font-bold hover:bg-red-600"
            >
              ✕ Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
