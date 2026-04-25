"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { importRecords } from "../actions/records";

type PreviewRow = {
  artist: string;
  title: string;
  format: string;
  label: string;
  catalogue_number: string;
  year_released: string;
  country: string;
  condition: string;
  price_paid: string;
  estimated_value: string;
  discogs_url: string;
  notes: string;
};

const emptyRow: PreviewRow = {
  artist: "",
  title: "",
  format: "",
  label: "",
  catalogue_number: "",
  year_released: "",
  country: "",
  condition: "",
  price_paid: "",
  estimated_value: "",
  discogs_url: "",
  notes: "",
};

function splitCsvLine(line: string) {
  return line
    .split(",")
    .map((value) => value.trim().replace(/^"|"$/g, ""));
}

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export default function ImportPreviewClient() {
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const stats = useMemo(() => {
    return {
      total: rows.length,
      missingArtist: rows.filter((row) => !row.artist).length,
      missingTitle: rows.filter((row) => !row.title).length,
      withDiscogs: rows.filter((row) => row.discogs_url).length,
    };
  }, [rows]);

  function handlePreview() {
    setError("");
    setImportMessage("");

    const lines = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      setRows([]);
      setError("Paste a header row and at least one record row.");
      return;
    }

    const headers = splitCsvLine(lines[0]).map(normalizeHeader);

    const parsedRows = lines.slice(1).map((line) => {
      const values = splitCsvLine(line);
      const row = { ...emptyRow };

      headers.forEach((header, index) => {
        const value = values[index] ?? "";

        if (header === "artist") row.artist = value;
        if (header === "title") row.title = value;
        if (header === "format") row.format = value;
        if (header === "label") row.label = value;
        if (header === "catalogue_number" || header === "catalog_number")
          row.catalogue_number = value;
        if (header === "year" || header === "year_released")
          row.year_released = value;
        if (header === "country") row.country = value;
        if (header === "condition") row.condition = value;
        if (header === "price_paid" || header === "price")
          row.price_paid = value;
        if (header === "estimated_value" || header === "value")
          row.estimated_value = value;
        if (header === "discogs_url") row.discogs_url = value;
        if (header === "notes") row.notes = value;
      });

      return row;
    });

    setRows(parsedRows);
  }

  function handleImport() {
    setError("");
    setImportMessage("");

    if (rows.length === 0) {
      setError("Preview records first before importing.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await importRecords(rows);

        setImportMessage(
          `Imported ${result.inserted} record${
            result.inserted === 1 ? "" : "s"
          }. Skipped ${result.skipped}.`
        );
      } catch (err) {
        console.error("Import failed:", err);
        setImportMessage("Import failed. Check terminal for details.");
      }
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">
              Collector Studio
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Import Preview
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Paste CSV-style collection data below. Preview the records first,
              then import valid rows into your collection.
            </p>
          </div>

          <Link
            href="/collection"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Back to Collection
          </Link>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
          <label className="text-sm font-medium text-slate-200">
            Paste CSV data
          </label>

          <textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder={`artist,title,format,label,catalogue_number,year_released,country,condition,price_paid,estimated_value,discogs_url,notes
Miles Davis,Kind of Blue,LP,Columbia,CS 8163,1959,US,VG+,24.99,85.00,https://www.discogs.com/release/example,Original pressing`}
            className="mt-3 min-h-[220px] w-full rounded-2xl border border-white/10 bg-slate-900/80 p-4 font-mono text-sm leading-6 text-slate-100 outline-none ring-0 placeholder:text-slate-600 focus:border-cyan-300/60"
          />

          {error ? (
            <p className="mt-3 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          {importMessage ? (
            <p className="mt-3 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              {importMessage}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePreview}
              className="rounded-2xl bg-gradient-to-r from-cyan-300 to-fuchsia-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90"
            >
              Preview Import
            </button>

            <button
              type="button"
              onClick={handleImport}
              disabled={isPending || rows.length === 0}
              className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Importing..." : "Import to Collection"}
            </button>

            <button
              type="button"
              onClick={() => {
                setRawText("");
                setRows([]);
                setError("");
                setImportMessage("");
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              Clear
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Rows
            </p>
            <p className="mt-2 text-3xl font-semibold">{stats.total}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Missing Artist
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {stats.missingArtist}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Missing Title
            </p>
            <p className="mt-2 text-3xl font-semibold">{stats.missingTitle}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Discogs Links
            </p>
            <p className="mt-2 text-3xl font-semibold">{stats.withDiscogs}</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold">Preview Rows</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Artist</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Format</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Condition</th>
                  <th className="px-4 py-3">Discogs</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No preview rows yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={`${row.artist}-${row.title}-${index}`}>
                      <td className="px-4 py-3 text-slate-200">
                        {row.artist || (
                          <span className="text-red-300">Missing</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-200">
                        {row.title || (
                          <span className="text-red-300">Missing</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-400">
                        {row.format}
                      </td>

                      <td className="px-4 py-3 text-slate-400">{row.label}</td>

                      <td className="px-4 py-3 text-slate-400">
                        {row.year_released}
                      </td>

                      <td className="px-4 py-3 text-slate-400">
                        {row.condition}
                      </td>

                      <td className="px-4 py-3">
                        {row.discogs_url ? (
                          <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs text-cyan-200">
                            Present
                          </span>
                        ) : (
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-500">
                            None
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}