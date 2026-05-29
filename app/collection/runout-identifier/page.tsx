"use client";

import { useState } from "react";
import Image from "next/image";
import CINavigation from "@/app/components/CINavigation";

type Evidence = {
  side: string;
  runout_raw: string;
  normalized_runout: string;
  identifier_value: string;
  identifier_description: string | null;
  confidence_score: number;
  confidence_label: string;
};

type Match = {
  discogs_release_id: string;
  confidence_score: number;
  confidence_tier: string;
  matched_sides: string[];
  evidence: Evidence[];
  artist: string;
  title: string;
  country: string;
  year: string | number | null;
  image_url: string | null;
  discogs_url: string;
};

function tierLabel(score: number) {
  if (score >= 100) return "Exact Pressing Match";
  if (score >= 90) return "Very High Confidence";
  if (score >= 80) return "High Confidence";
  if (score >= 70) return "Possible Variant";
  return "Low Confidence";
}

export default function RunoutIdentifierPage() {
  const [sideA, setSideA] = useState("");
  const [sideB, setSideB] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [message, setMessage] = useState("");
  const [recordId, setRecordId] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  async function identify() {
    setLoading(true);
    setMessage("");
    setMatches([]);

    const response = await fetch("/api/runouts/identify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sideA, sideB }),
    });

    const data = await response.json();

    setMessage(data.message ?? "");
    setMatches(data.matches ?? []);
    setLoading(false);
  }

  async function savePressing(match: Match) {
    setSaveMessage("");

    const parsedRecordId = Number(recordId);

    if (!Number.isFinite(parsedRecordId) || parsedRecordId <= 0) {
      setSaveMessage("Enter a valid record ID before saving.");
      return;
    }

    const response = await fetch("/api/runouts/save-pressing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recordId: parsedRecordId,
        discogsReleaseId: match.discogs_release_id,
        confidenceScore: match.confidence_score,
        confidenceTier: match.confidence_tier,
      }),
    });

    const data = await response.json();
    setSaveMessage(data.message ?? "Save request completed.");
  }

  const topMatch = matches[0];

  return (
    <main className="min-h-screen bg-[#030303] px-6 py-6 text-zinc-100">
      <CINavigation />

      <section className="mx-auto max-w-7xl">
        <div className="rounded-[36px] border border-cyan-500/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-8 shadow-2xl">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.4em] text-cyan-300">
            Runout / Matrix Intelligence
          </p>

          <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white md:text-6xl">
            Identify My Pressing
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-400">
            Enter the deadwax / matrix numbers from Side A and Side B. Collector
            Intelligence compares your inscriptions against synced Discogs
            Matrix / Runout identifiers and ranks likely release candidates.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-cyan-400/10 bg-cyan-400/5 p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                Engine
              </p>
              <p className="mt-2 text-2xl font-black text-white">Deadwax AI</p>
              <p className="mt-1 text-sm text-zinc-500">
                Normalized matrix comparison
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                Match Logic
              </p>
              <p className="mt-2 text-2xl font-black text-white">A + B</p>
              <p className="mt-1 text-sm text-zinc-500">
                Multi-side confidence boost
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                Result Type
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                Pressing Candidate
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Release identity + evidence
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <label className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
              Optional Record ID for Save
            </label>
            <input
              value={recordId}
              onChange={(event) => setRecordId(event.target.value)}
              placeholder="Example: 1"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-4 text-white outline-none focus:border-cyan-400/40"
            />
            <p className="mt-2 text-sm text-zinc-500">
              Enter the CI record ID if you want to save the identified pressing
              back to your collection.
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <label className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                Side A Runout
              </label>
              <input
                value={sideA}
                onChange={(event) => setSideA(event.target.value)}
                placeholder="Example: BPRS 4501 4S"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-4 text-white outline-none focus:border-cyan-400/40"
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <label className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                Side B Runout
              </label>
              <input
                value={sideB}
                onChange={(event) => setSideB(event.target.value)}
                placeholder="Example: BPRS 4502 2S"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-4 text-white outline-none focus:border-cyan-400/40"
              />
            </div>
          </div>

          <button
            onClick={identify}
            disabled={loading}
            className="mt-6 rounded-2xl bg-cyan-300 px-6 py-4 text-sm font-black uppercase tracking-[0.25em] text-black transition hover:bg-cyan-200 disabled:opacity-50"
          >
            {loading ? "Identifying..." : "Identify Pressing"}
          </button>
        </div>

        {topMatch ? (
          <section className="mt-8 overflow-hidden rounded-[36px] border border-cyan-400/20 bg-cyan-400/5">
            <div className="grid gap-0 md:grid-cols-[260px_1fr]">
              <div className="relative min-h-[260px] bg-black">
                {topMatch.image_url ? (
                  <Image
                    src={topMatch.image_url}
                    alt={`${topMatch.artist} ${topMatch.title}`}
                    fill
                    className="object-cover"
                    sizes="260px"
                  />
                ) : (
                  <div className="flex h-full min-h-[260px] items-center justify-center text-sm text-zinc-600">
                    No Artwork
                  </div>
                )}
              </div>

              <div className="p-7">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
                  Best Match
                </p>
                <h2 className="mt-3 text-3xl font-black text-white">
                  {topMatch.artist} — {topMatch.title}
                </h2>

                <p className="mt-2 text-zinc-400">
                  {topMatch.country} · {topMatch.year ?? "Unknown Year"} ·
                  Discogs Release {topMatch.discogs_release_id}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                      Confidence
                    </p>
                    <p className="text-4xl font-black text-white">
                      {topMatch.confidence_score}%
                    </p>
                    <p className="text-sm text-zinc-400">
                      {tierLabel(topMatch.confidence_score)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                      Matched Sides
                    </p>
                    <p className="text-3xl font-black text-white">
                      {topMatch.matched_sides.join(" + ")}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href={topMatch.discogs_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:border-cyan-400/30"
                  >
                    Open Discogs Release
                  </a>

                  <button
                    onClick={() => savePressing(topMatch)}
                    className="inline-flex rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-black transition hover:bg-cyan-200"
                  >
                    Save Pressing
                  </button>
                </div>

                {saveMessage ? (
                  <p className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-300">
                    {saveMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
                Candidate Matches
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Runout Match Results
              </h2>
            </div>

            <div className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-400">
              {message || "Waiting for input"}
            </div>
          </div>

          {matches.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-zinc-500">
              No matches yet. Enter a runout above to identify a pressing.
            </div>
          ) : (
            <div className="grid gap-4">
              {matches.map((match) => (
                <div
                  key={match.discogs_release_id}
                  className="rounded-3xl border border-white/10 bg-black/40 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
                        {match.confidence_tier} · Sides{" "}
                        {match.matched_sides.join(" + ")}
                      </p>
                      <h3 className="mt-2 text-xl font-black text-white">
                        {match.artist} — {match.title}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-400">
                        {match.country} · {match.year ?? "Unknown Year"} ·
                        Release {match.discogs_release_id}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-4 text-right">
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                        Confidence
                      </p>
                      <p className="text-3xl font-black text-white">
                        {match.confidence_score}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {match.evidence.map((item, index) => (
                      <div
                        key={`${match.discogs_release_id}-${item.identifier_value}-${index}`}
                        className="rounded-2xl bg-white/[0.03] p-4"
                      >
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Side {item.side} · {item.confidence_label} ·{" "}
                          {item.confidence_score}%
                        </p>
                        <p className="mt-1 font-mono text-sm text-zinc-200">
                          User: {item.runout_raw}
                        </p>
                        <p className="mt-1 font-mono text-sm text-cyan-200">
                          Discogs: {item.identifier_value}
                        </p>
                        {item.identifier_description ? (
                          <p className="mt-1 text-sm text-zinc-500">
                            {item.identifier_description}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
