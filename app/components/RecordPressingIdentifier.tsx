"use client";

import { useState } from "react";

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

export default function RecordPressingIdentifier({
  recordId,
}: {
  recordId: number;
}) {
  const [sideA, setSideA] = useState("");
  const [sideB, setSideB] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [message, setMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  async function identify() {
    setLoading(true);
    setMessage("");
    setSaveMessage("");
    setMatches([]);

    const response = await fetch("/api/runouts/identify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recordId, sideA, sideB }),
    });

    const data = await response.json();

    setMessage(data.message ?? "");
    setMatches(data.matches ?? []);
    setLoading(false);
  }

  async function savePressing(match: Match) {
    setSaveMessage("");

    const response = await fetch("/api/runouts/save-pressing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recordId,
        discogsReleaseId: match.discogs_release_id,
        confidenceScore: match.confidence_score,
        confidenceTier: match.confidence_tier,
      }),
    });

    const data = await response.json();
    setSaveMessage(data.message ?? "Save request completed.");
  }

  return (
    <section className="rounded-[32px] border border-cyan-400/10 bg-cyan-400/[0.04] p-6 shadow-xl backdrop-blur-xl">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
        Pressing Intelligence
      </p>

      <h3 className="mt-3 text-3xl font-black text-white">
        Identify This Pressing
      </h3>

      <p className="mt-3 text-sm leading-7 text-white/55">
        Enter the Side A and Side B deadwax / matrix numbers for this record.
        Collector Intelligence will compare the inscriptions and save the best
        confirmed pressing back to this record.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
            Side A Runout
          </label>
          <input
            value={sideA}
            onChange={(event) => setSideA(event.target.value)}
            placeholder="Example: BPRS 4501 4S"
            className="mt-3 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-4 text-white outline-none focus:border-cyan-300/40"
          />
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
            Side B Runout
          </label>
          <input
            value={sideB}
            onChange={(event) => setSideB(event.target.value)}
            placeholder="Example: BPRS 4502 2S"
            className="mt-3 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-4 text-white outline-none focus:border-cyan-300/40"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={identify}
        disabled={loading || (!sideA.trim() && !sideB.trim())}
        className="mt-5 rounded-2xl bg-cyan-300 px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-black transition hover:bg-cyan-200 disabled:opacity-40"
      >
        {loading ? "Identifying..." : "Identify Pressing"}
      </button>

      {message ? (
        <p className="mt-4 text-sm text-white/55">{message}</p>
      ) : null}

      {matches.length > 0 ? (
        <div className="mt-6 space-y-4">
          {matches.slice(0, 3).map((match) => (
            <div
              key={match.discogs_release_id}
              className="rounded-3xl border border-white/10 bg-black/30 p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xl font-black text-white">
                    {match.artist} — {match.title}
                  </p>

                  <p className="mt-2 text-sm text-white/50">
                    {match.country || "Country unknown"} · {match.year || "Year unknown"} · Discogs #{match.discogs_release_id}
                  </p>

                  <p className="mt-3 text-sm font-bold text-cyan-200">
                    {match.confidence_tier} · {match.confidence_score}%
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => savePressing(match)}
                  className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100"
                >
                  Save Pressing
                </button>
              </div>

              {match.evidence?.length ? (
                <div className="mt-4 grid gap-3">
                  {match.evidence.map((item, index) => (
                    <div
                      key={`${item.side}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                    >
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
                        Side {item.side}
                      </p>
                      <p className="mt-1 font-mono text-sm text-white">
                        {item.runout_raw}
                      </p>
                      <p className="mt-1 text-xs text-cyan-200">
                        {item.confidence_label} · {item.confidence_score}%
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {saveMessage ? (
        <p className="mt-4 text-sm font-bold text-cyan-200">
          {saveMessage}
        </p>
      ) : null}
    </section>
  );
}
