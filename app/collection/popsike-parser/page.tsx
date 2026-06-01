"use client";

import { useState } from "react";

export default function PopsikeParserPage() {
  const [html, setHtml] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function parseHtml() {
    setLoading(true);
    setResult(null);

    const response = await fetch("/api/test-popsike-parser", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ html }),
    });

    const json = await response.json();
    setResult(json);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">
            Collector Intelligence Parser Lab
          </p>
          <h1 className="mt-3 text-4xl font-bold">
            Popsike HTML Parser
          </h1>
          <p className="mt-3 text-zinc-400">
            Paste copied Popsike page HTML below, then parse it into structured CI rows.
          </p>
        </div>

        <textarea
          className="h-[360px] w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-sm text-zinc-200 outline-none"
          placeholder="Paste Popsike outerHTML here..."
          value={html}
          onChange={(event) => setHtml(event.target.value)}
        />

        <button
          onClick={parseHtml}
          disabled={loading || html.length < 100}
          className="rounded-2xl bg-emerald-500 px-6 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Parsing..." : "Parse Popsike HTML"}
        </button>

        {result && (
          <pre className="max-h-[500px] overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-emerald-200">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </main>
  );
}
