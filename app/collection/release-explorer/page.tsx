"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import CINavigation from "../../components/CINavigation";

type SearchMode = "artist" | "release" | "catalog" | "discogs";
type StatusFilter = "all" | "owned" | "missing" | "want" | "reviewed" | "unreviewed" | "ignored";
type SortOption = "year-asc" | "year-desc" | "artist" | "title" | "country" | "missing-first" | "owned-first";

type ReleaseResult = {
  id: string;
  warehouse_source: string;
  canonical_artist: string | null;
  raw_artist: string | null;
  title: string | null;
  country: string | null;
  label: string | null;
  catalog_number: string | null;
  format: string | null;
  release_year: number | string | null;
  discogs_release_id: number | string | null;
  discogs_master_id: number | string | null;
  genres?: string[] | null;
  styles?: string[] | null;
  variant_signature: string | null;
  intelligence_status: string | null;
  owned: boolean;
  owned_record_id: number | null;
  in_want_list?: boolean;
  reviewed?: boolean;
  ignored?: boolean;
};

const STORAGE_QUERY = "ci-archive-explorer-query";
const STORAGE_MODE = "ci-archive-explorer-mode";
const STORAGE_RESULTS = "ci-archive-explorer-results";
const STORAGE_SUMMARY = "ci-archive-explorer-summary";
const STORAGE_SCROLL = "ci-archive-explorer-scroll";

function releaseKey(result: ReleaseResult) {
  return String(result.discogs_release_id || result.id);
}

function numericYear(value: number | string | null) {
  const year = Number(value);
  return Number.isFinite(year) ? year : 0;
}

export default function ArchiveExplorerPage() {
  const resultsStartRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("artist");
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [results, setResults] = useState<ReleaseResult[]>([]);
  const [summary, setSummary] = useState({ loadedCount: 0, ownedCount: 0, missingCount: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hideIgnored, setHideIgnored] = useState(true);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("all");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("year-asc");

  useEffect(() => {
    try {
      const storedQuery = sessionStorage.getItem(STORAGE_QUERY);
      const storedMode = sessionStorage.getItem(STORAGE_MODE) as SearchMode | null;
      const storedResults = sessionStorage.getItem(STORAGE_RESULTS);
      const storedSummary = sessionStorage.getItem(STORAGE_SUMMARY);
      const storedScroll = sessionStorage.getItem(STORAGE_SCROLL);

      if (storedQuery) setQuery(storedQuery);
      if (storedMode) setMode(storedMode);
      if (storedResults) setResults(JSON.parse(storedResults));
      if (storedSummary) setSummary(JSON.parse(storedSummary));

      if (storedScroll) {
        setTimeout(() => window.scrollTo(0, Number(storedScroll)), 150);
      }
    } catch (error) {
      console.error("Archive Explorer restore failed:", error);
    }
  }, []);

  const countries = useMemo(() => {
    return Array.from(new Set(results.map((r) => r.country).filter(Boolean) as string[])).sort();
  }, [results]);

  const formats = useMemo(() => {
    return Array.from(new Set(results.map((r) => r.format).filter(Boolean) as string[])).sort();
  }, [results]);

  const labels = useMemo(() => {
    return Array.from(new Set(results.map((r) => r.label).filter(Boolean) as string[])).sort();
  }, [results]);

  const displayedResults = useMemo(() => {
    const filtered = results.filter((result) => {
      const year = numericYear(result.release_year);

      if (statusFilter === "owned" && !result.owned) return false;
      if (statusFilter === "missing" && result.owned) return false;
      if (statusFilter === "want" && !result.in_want_list) return false;
      if (statusFilter === "reviewed" && !result.reviewed) return false;
      if (statusFilter === "unreviewed" && result.reviewed) return false;
      if (statusFilter === "ignored" && !result.ignored) return false;
      if (hideIgnored && result.ignored && statusFilter !== "ignored") return false;

      if (countryFilter !== "all" && result.country !== countryFilter) return false;
      if (formatFilter !== "all" && result.format !== formatFilter) return false;
      if (labelFilter !== "all" && result.label !== labelFilter) return false;

      if (yearFrom && year < Number(yearFrom)) return false;
      if (yearTo && year > Number(yearTo)) return false;

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "year-desc") return numericYear(b.release_year) - numericYear(a.release_year);
      if (sortBy === "artist") return String(a.canonical_artist || "").localeCompare(String(b.canonical_artist || ""));
      if (sortBy === "title") return String(a.title || "").localeCompare(String(b.title || ""));
      if (sortBy === "country") return String(a.country || "").localeCompare(String(b.country || ""));
      if (sortBy === "missing-first") return Number(a.owned) - Number(b.owned);
      if (sortBy === "owned-first") return Number(b.owned) - Number(a.owned);
      return numericYear(a.release_year) - numericYear(b.release_year);
    });
  }, [results, statusFilter, countryFilter, formatFilter, labelFilter, yearFrom, yearTo, sortBy]);

  const completionPct =
    summary.loadedCount > 0 ? Math.round((summary.ownedCount / summary.loadedCount) * 100) : 0;

  function rememberPosition() {
    sessionStorage.setItem(STORAGE_QUERY, query);
    sessionStorage.setItem(STORAGE_MODE, mode);
    sessionStorage.setItem(STORAGE_RESULTS, JSON.stringify(results));
    sessionStorage.setItem(STORAGE_SUMMARY, JSON.stringify(summary));
    sessionStorage.setItem(STORAGE_SCROLL, String(window.scrollY));
  }

  async function runSearch() {
    const cleaned = query.trim();
    if (!cleaned) return;

    setLoading(true);
    setResults([]);
    setSummary({ loadedCount: 0, ownedCount: 0, missingCount: 0 });

    try {
      const response = await fetch(
        `/api/release-explorer/search?q=${encodeURIComponent(cleaned)}&mode=${mode}`,
        { cache: "no-store" },
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Archive Explorer search failed.");

      const nextResults = (data.results || []) as ReleaseResult[];
      const nextSummary = {
        loadedCount: Number(data.loadedCount || 0),
        ownedCount: Number(data.ownedCount || 0),
        missingCount: Number(data.missingCount || 0),
      };

      setResults(nextResults);
      setSummary(nextSummary);

      sessionStorage.setItem(STORAGE_QUERY, cleaned);
      sessionStorage.setItem(STORAGE_MODE, mode);
      sessionStorage.setItem(STORAGE_RESULTS, JSON.stringify(nextResults));
      sessionStorage.setItem(STORAGE_SUMMARY, JSON.stringify(nextSummary));
      sessionStorage.setItem(STORAGE_SCROLL, "0");

      setTimeout(() => resultsStartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function toggleAction(result: ReleaseResult, actionType: "want" | "reviewed" | "ignored") {
    const key = releaseKey(result);
    setActingId(`${key}-${actionType}`);
    rememberPosition();

    try {
      const response = await fetch("/api/release-explorer/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_release_id: key, action_type: actionType }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Action failed.");

      setResults((current) =>
        current.map((item) =>
          releaseKey(item) === key
            ? {
                ...item,
                in_want_list: actionType === "want" ? data.active : item.in_want_list,
                reviewed: actionType === "reviewed" ? data.active : item.reviewed,
                ignored: actionType === "ignored" ? data.active : item.ignored,
              }
            : item,
        ),
      );
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setActingId(null);
    }
  }

  async function addToCollection(result: ReleaseResult) {
    const key = releaseKey(result);
    setActingId(`${key}-add`);
    rememberPosition();

    try {
      const response = await fetch("/api/release-explorer/add-to-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist: result.canonical_artist || result.raw_artist,
          title: result.title,
          country: result.country,
          label: result.label,
          catalog_number: result.catalog_number,
          format: result.format,
          release_year: result.release_year,
          discogs_release_id: result.discogs_release_id,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to add this release.");

      setResults((current) =>
        current.map((item) =>
          releaseKey(item) === key
            ? { ...item, owned: true, owned_record_id: data.recordId }
            : item,
        ),
      );

      if (!data.alreadyOwned) {
        setSummary((current) => ({
          ...current,
          ownedCount: current.ownedCount + 1,
          missingCount: Math.max(0, current.missingCount - 1),
        }));
      }
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setActingId(null);
    }
  }

  async function bulkAction(actionType: "want" | "reviewed" | "ignored") {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    rememberPosition();
    setActingId(`bulk-${actionType}`);

    try {
      const response = await fetch("/api/release-explorer/bulk-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_release_ids: ids, action_type: actionType }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Bulk action failed.");

      setResults((current) =>
        current.map((item) =>
          ids.includes(releaseKey(item))
            ? {
                ...item,
                in_want_list: actionType === "want" ? true : item.in_want_list,
                reviewed: actionType === "reviewed" ? true : item.reviewed,
                ignored: actionType === "ignored" ? true : item.ignored,
              }
            : item,
        ),
      );

      setSelectedIds(new Set());
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setActingId(null);
    }
  }

  function exportCsv() {
    const headers = [
      "status",
      "artist",
      "title",
      "country",
      "label",
      "catalog_number",
      "format",
      "release_year",
      "discogs_release_id",
      "want_list",
      "reviewed",
      "ignored",
    ];

    const rows = displayedResults.map((r) => [
      r.owned ? "owned" : "missing",
      r.canonical_artist || r.raw_artist || "",
      r.title || "",
      r.country || "",
      r.label || "",
      r.catalog_number || "",
      r.format || "",
      r.release_year || "",
      r.discogs_release_id || "",
      r.in_want_list ? "yes" : "no",
      r.reviewed ? "yes" : "no",
      r.ignored ? "yes" : "no",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "archive-explorer-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#050403] text-white">
      <CINavigation />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-[40px] border border-[#32281D] bg-gradient-to-br from-[#14100B] via-[#0B0806] to-[#17110A] p-8 shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#D8B65A]">Collector Intelligence</p>
              <h1 className="mt-4 text-5xl font-black">Archive Explorer</h1>
              <p className="mt-4 max-w-3xl text-[#B8AA96]">
                Search the six-million-release Discogs warehouse, compare against your collection, review exact releases, and add them directly.
              </p>
            </div>

            <Link href="/collection" onClick={rememberPosition} className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-[#B8AA96] transition hover:text-white">
              Back To Collection
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <ModeButton active={mode === "artist"} onClick={() => setMode("artist")} label="Artist Catalog" />
            <ModeButton active={mode === "release"} onClick={() => setMode("release")} label="Release / Variant" />
            <ModeButton active={mode === "catalog"} onClick={() => setMode("catalog")} label="Catalog Number" />
            <ModeButton active={mode === "discogs"} onClick={() => setMode("discogs")} label="Discogs ID" />
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") runSearch();
              }}
              className="h-16 rounded-3xl border border-[#3A3025] bg-[#090705] px-6 text-white outline-none placeholder:text-[#756A5B] focus:border-[#D8B65A]/50"
              placeholder={
                mode === "artist"
                  ? "Artist name, e.g. Kevin Ayers"
                  : mode === "release"
                    ? "Artist and title, e.g. David Bowie Space Oddity"
                    : mode === "catalog"
                      ? "Catalog number, e.g. SHVL 763"
                      : "Discogs Release ID"
              }
            />

            <button
              onClick={runSearch}
              disabled={loading}
              className="h-16 rounded-3xl bg-[#C7A45D] px-10 font-black text-black transition hover:bg-[#D8B86A] disabled:opacity-60"
            >
              {loading ? "Searching Warehouse..." : "Search Warehouse"}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-[#8E8170]">
            <Badge text="Source: Discogs Warehouse" tone="cyan" />
            <span>Table: release_reference</span>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Stat label="Warehouse Loaded" value={summary.loadedCount} />
          <Stat label="Owned" value={summary.ownedCount} />
          <Stat label="Missing" value={summary.missingCount} />
          <Stat label="Complete" value={completionPct} suffix="%" />
        </div>

        {results.length > 0 ? (
          <section className="mt-8 rounded-[34px] border border-[#32281D] bg-[#0F0C09] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#D8B65A]">Filter Loaded Results</p>

              <label className="flex items-center gap-3 text-sm font-bold text-[#B8AA96]">
                <input
                  type="checkbox"
                  checked={hideIgnored}
                  onChange={(e) => setHideIgnored(e.target.checked)}
                />
                Hide Ignored
              </label>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Select value={statusFilter} onChange={(v) => setStatusFilter(v as StatusFilter)} options={[
                ["all", "All Statuses"], ["owned", "Owned"], ["missing", "Missing"], ["want", "Want List"],
                ["reviewed", "Reviewed"], ["unreviewed", "Unreviewed"], ["ignored", "Ignored"]
              ]} />

              <Select value={countryFilter} onChange={setCountryFilter} options={[["all", "All Countries"], ...countries.map((c) => [c, c] as [string, string])]} />
              <Select value={formatFilter} onChange={setFormatFilter} options={[["all", "All Formats"], ...formats.map((f) => [f, f] as [string, string])]} />
              <Select value={labelFilter} onChange={setLabelFilter} options={[["all", "All Labels"], ...labels.map((l) => [l, l] as [string, string])]} />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <input value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="Year from" inputMode="numeric" className="h-12 rounded-2xl border border-[#3A3025] bg-[#090705] px-4" />
              <input value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="Year to" inputMode="numeric" className="h-12 rounded-2xl border border-[#3A3025] bg-[#090705] px-4" />
              <Select value={sortBy} onChange={(v) => setSortBy(v as SortOption)} options={[
                ["year-asc", "Oldest First"], ["year-desc", "Newest First"], ["missing-first", "Missing First"],
                ["owned-first", "Owned First"], ["artist", "Artist"], ["title", "Title"], ["country", "Country"]
              ]} />
            </div>
          </section>
        ) : null}

        <section ref={resultsStartRef} className="mt-10">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.35em] text-[#B48A4D]">Warehouse Results</p>
            <h2 className="mt-2 text-4xl font-black">{displayedResults.length.toLocaleString()} Displayed</h2>
          </div>

          {displayedResults.length > 0 ? (
            <div className="mb-6 rounded-[28px] border border-[#32281D] bg-[#0F0C09] p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-[#8E8170]">
                    Bulk Actions
                  </p>
                  <p className="mt-1 text-sm text-[#B8AA96]">
                    {selectedIds.size.toLocaleString()} selected
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set(displayedResults.map(releaseKey)))}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-[#B8AA96]"
                  >
                    Select Displayed
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-[#B8AA96]"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={() => bulkAction("want")}
                    disabled={!selectedIds.size || actingId === "bulk-want"}
                    className="rounded-2xl border border-fuchsia-400/25 bg-fuchsia-400/10 px-4 py-2 text-xs font-black text-fuchsia-200 disabled:opacity-50"
                  >
                    Bulk Want
                  </button>

                  <button
                    type="button"
                    onClick={() => bulkAction("reviewed")}
                    disabled={!selectedIds.size || actingId === "bulk-reviewed"}
                    className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-200 disabled:opacity-50"
                  >
                    Bulk Reviewed
                  </button>

                  <button
                    type="button"
                    onClick={() => bulkAction("ignored")}
                    disabled={!selectedIds.size || actingId === "bulk-ignored"}
                    className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-2 text-xs font-black text-red-200 disabled:opacity-50"
                  >
                    Bulk Ignore
                  </button>

                  <button
                    type="button"
                    onClick={exportCsv}
                    className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-xs font-black text-cyan-200"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-5">
            {displayedResults.map((result) => {
              const key = releaseKey(result);
              return (
                <article key={result.id} className="rounded-[30px] border border-[#2D241B] bg-[#0F0C09] p-6 shadow-xl">
                  <div className="mb-4 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(key)}
                      onChange={(e) => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) next.add(key);
                        else next.delete(key);
                        setSelectedIds(next);
                      }}
                    />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[#8E8170]">
                      Select Release
                    </span>
                  </div>

                  <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <Badge text={result.owned ? "Owned" : "Missing From Your Collection"} tone={result.owned ? "green" : "gold"} />
                        <Badge text="Warehouse" tone="cyan" />
                        {result.country ? <Badge text={result.country} /> : null}
                        {result.in_want_list ? <Badge text="Want List" tone="pink" /> : null}
                        {result.reviewed ? <Badge text="Reviewed" tone="green" /> : null}
                        {result.ignored ? <Badge text="Ignored" /> : null}
                      </div>

                      <p className="mt-4 text-xs uppercase tracking-[0.25em] text-[#B48A4D]">
                        {result.canonical_artist || result.raw_artist || "Unknown Artist"}
                      </p>

                      <h3 className="mt-2 text-3xl font-black">{result.title || "Untitled"}</h3>

                      <p className="mt-3 leading-7 text-[#B8AA96]">
                        {[result.label, result.catalog_number, result.format, result.release_year].filter(Boolean).join(" · ") || "Variant metadata pending"}
                      </p>

                      <p className="mt-3 text-xs text-[#756A5B]">
                        Discogs Release: {String(result.discogs_release_id || "—")}
                        {result.discogs_master_id ? ` · Master: ${result.discogs_master_id}` : ""}
                      </p>

                      {result.variant_signature ? (
                        <p className="mt-3 break-words text-sm leading-6 text-[#8E8170]">{result.variant_signature}</p>
                      ) : null}
                    </div>

                    <div className="flex w-full shrink-0 flex-col gap-3 xl:w-56">
                      {result.owned && result.owned_record_id ? (
                        <Link href={`/collection/${result.owned_record_id}`} onClick={rememberPosition} className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-5 py-3 text-center text-sm font-black text-emerald-200">
                          Open Owned Copy
                        </Link>
                      ) : (
                        <button disabled={actingId === `${key}-add`} onClick={() => addToCollection(result)} className="rounded-2xl border border-[#D8B65A]/30 bg-[#D8B65A]/10 px-5 py-3 text-sm font-black text-[#F4CD68] disabled:opacity-60">
                          {actingId === `${key}-add` ? "Adding..." : "Add To Collection"}
                        </button>
                      )}

                      <a href={`https://www.discogs.com/release/${result.discogs_release_id}`} target="_blank" rel="noopener noreferrer" onClick={rememberPosition} className="rounded-2xl border border-blue-400/25 bg-blue-400/10 px-5 py-3 text-center text-sm font-black text-blue-200">
                        Review On Discogs ↗
                      </a>

                      <button disabled={actingId === `${key}-want`} onClick={() => toggleAction(result, "want")} className="rounded-2xl border border-fuchsia-400/25 bg-fuchsia-400/10 px-5 py-3 text-sm font-black text-fuchsia-200 disabled:opacity-60">
                        {result.in_want_list ? "On Want List ✓" : "Add To Want List"}
                      </button>

                      <button disabled={actingId === `${key}-reviewed`} onClick={() => toggleAction(result, "reviewed")} className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-[#B8AA96] disabled:opacity-60">
                        {result.reviewed ? "Reviewed ✓" : "Mark Reviewed"}
                      </button>

                      <button disabled={actingId === `${key}-ignored`} onClick={() => toggleAction(result, "ignored")} className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-3 text-sm font-black text-red-200 disabled:opacity-60">
                        {result.ignored ? "Ignored ✓" : "Ignore"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

function ModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={active ? "rounded-full border border-[#D8B65A]/40 bg-[#D8B65A]/15 px-5 py-3 text-sm font-black text-[#F4CD68]" : "rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-black text-[#8E8170] transition hover:text-white"}>
      {label}
    </button>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-12 rounded-2xl border border-[#3A3025] bg-[#090705] px-4">
      {options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
    </select>
  );
}

function Stat({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-[28px] border border-[#2D241B] bg-[#0F0C09] p-6">
      <p className="text-xs uppercase tracking-[0.25em] text-[#8E8170]">{label}</p>
      <p className="mt-2 text-4xl font-black">{value.toLocaleString()}{suffix}</p>
    </div>
  );
}

function Badge({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "green" | "gold" | "cyan" | "pink" }) {
  const className =
    tone === "green" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" :
    tone === "gold" ? "border-[#D8B65A]/30 bg-[#D8B65A]/10 text-[#F4CD68]" :
    tone === "cyan" ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200" :
    tone === "pink" ? "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200" :
    "border-white/10 bg-white/[0.04] text-[#B8AA96]";

  return <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${className}`}>{text}</span>;
}
