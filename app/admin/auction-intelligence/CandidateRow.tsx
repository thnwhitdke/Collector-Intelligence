"use client";

import { useTransition } from "react";
import { reviewAuctionCandidate } from "./actions";

function money(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function CandidateRow({ candidate }: { candidate: any }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
            Record #{candidate.record_id}
          </div>

          <div className="mt-1 text-sm text-[#B8AA96]">
            {candidate.artist} — {candidate.record_title}
          </div>

          <div className="mt-1 text-xs text-[#8E8170]">
            {candidate.label ?? "No label"} · {candidate.catalogue_number ?? "No catalog #"} · Discogs {candidate.discogs_release_id ?? "—"}
          </div>

          <h2 className="mt-4 text-xl font-black text-white">
            {candidate.auction_title ?? "Untitled auction"}
          </h2>

          <a
            href={candidate.source_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block break-all text-sm font-bold text-[#F4CD68] hover:underline"
          >
            Open evidence source
          </a>

          {candidate.notes ? (
            <p className="mt-3 text-sm leading-6 text-[#B8AA96]">
              {candidate.notes}
            </p>
          ) : null}
        </div>

        <div className="min-w-[220px] text-left md:text-right">
          <div className="text-3xl font-black text-[#F4CD68]">
            {money(candidate.amount_usd ?? candidate.amount)}
          </div>

          <div className="mt-1 text-xs text-[#8E8170]">
            original {candidate.currency ?? "—"} {Number(candidate.amount ?? 0).toLocaleString()}
          </div>

          <div className="mt-6 flex gap-2 md:justify-end">
            <button
              disabled={pending}
              onClick={() =>
                startTransition(() =>
                  reviewAuctionCandidate(candidate.id, "accepted")
                )
              }
              className="rounded-xl bg-emerald-700 px-4 py-2 font-black text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              ✓ Approve
            </button>

            <button
              disabled={pending}
              onClick={() =>
                startTransition(() =>
                  reviewAuctionCandidate(candidate.id, "rejected")
                )
              }
              className="rounded-xl bg-red-700 px-4 py-2 font-black text-white hover:bg-red-600 disabled:opacity-50"
            >
              ✕ Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
