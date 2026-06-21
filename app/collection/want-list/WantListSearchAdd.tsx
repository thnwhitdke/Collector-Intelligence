"use client";

import { useState } from "react";
import { addDiscogsReleaseToWantList } from "@/app/actions/want-list";

type DiscogsResult = {
  id: number;
  title: string;
  year: string | number | null;
  country: string | null;
  label: string | null;
  catno: string | null;
  format: string | null;
  thumb: string | null;
  uri: string | null;
};

export default function WantListSearchAdd() {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [notes, setNotes] = useState("");
  const [results, setResults] = useState<DiscogsResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualReleaseId, setManualReleaseId] = useState("");

  async function searchDiscogs() {
    const cleaned = query.trim();
    if (!cleaned) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/discogs/search?q=${encodeURIComponent(cleaned)}`,
      );

      const json = await response.json();
      setResults(json.results || []);
    } catch (error) {
      console.error(error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-3 lg:grid-cols-[1fr_180px_1fr_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              searchDiscogs();
            }
          }}
          placeholder="Search artist, title, catalog number, pressing..."
          className="rounded-3xl border border-[#3A3025] bg-[#090705] px-5 py-4 text-sm outline-none transition focus:border-[#C7A45D]"
        />

        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
          className="rounded-3xl border border-[#3A3025] bg-[#090705] px-5 py-4 text-sm outline-none transition focus:border-[#C7A45D]"
        >
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Acquisition notes"
          className="rounded-3xl border border-[#3A3025] bg-[#090705] px-5 py-4 text-sm outline-none transition focus:border-[#C7A45D]"
        />

        <button
          type="button"
          onClick={searchDiscogs}
          className="rounded-3xl bg-[#C7A45D] px-6 py-4 text-sm font-black text-black transition hover:bg-[#E0BF73]"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {results.length > 0 ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {results.map((result) => (
            <form
              key={result.id}
              action={addDiscogsReleaseToWantList}
              className="rounded-[28px] border border-[#32281D] bg-[#090705] p-4"
            >
              <input type="hidden" name="discogs_release_id" value={result.id} />
              <input type="hidden" name="priority" value={priority} />
              <input type="hidden" name="notes" value={notes} />

              <div className="flex gap-4">
                {result.thumb ? (
                  <img
                    src={result.thumb}
                    alt=""
                    className="h-20 w-20 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-white/10" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black text-white">
                    {result.title}
                  </p>

                  <p className="mt-1 text-sm text-[#CDBB9F]">
                    {[result.country, result.year, result.catno]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>

                  <p className="mt-1 line-clamp-2 text-xs text-[#8E8170]">
                    {result.format}
                  </p>

                  <p className="mt-1 text-xs text-[#8E8170]">
                    Release ID: {result.id}
                  </p>
                </div>

                <button
                  type="submit"
                  className="self-center rounded-2xl bg-[#C7A45D] px-4 py-3 text-xs font-black text-black"
                >
                  Add
                </button>
              </div>
            </form>
          ))}
        </div>
      ) : null}

      <form
        action={addDiscogsReleaseToWantList}
        className="grid gap-3 rounded-[28px] border border-dashed border-[#3A3025] bg-[#090705] p-4 lg:grid-cols-[1fr_180px_1fr_auto]"
      >
        <input
          name="discogs_release_id"
          value={manualReleaseId}
          onChange={(event) => setManualReleaseId(event.target.value)}
          placeholder="Manual Discogs release ID"
          className="rounded-3xl border border-[#3A3025] bg-[#050403] px-5 py-4 text-sm outline-none transition focus:border-[#C7A45D]"
        />

        <select
          name="priority"
          defaultValue="Medium"
          className="rounded-3xl border border-[#3A3025] bg-[#050403] px-5 py-4 text-sm outline-none transition focus:border-[#C7A45D]"
        >
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

        <input
          name="notes"
          placeholder="Manual notes"
          className="rounded-3xl border border-[#3A3025] bg-[#050403] px-5 py-4 text-sm outline-none transition focus:border-[#C7A45D]"
        />

        <button
          type="submit"
          className="rounded-3xl border border-white/10 bg-white/10 px-6 py-4 text-sm font-black text-white transition hover:bg-white/15"
        >
          Add ID
        </button>
      </form>
    </div>
  );
}
