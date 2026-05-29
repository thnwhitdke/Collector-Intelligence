"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addRecord } from "../actions/records";
import BarcodeScanner from "./BarcodeScanner";
import { searchDiscogsMatches } from "../actions/records";

type Props = {
  onSuccess?: () => void;
};

const CONDITION_OPTIONS = [
  "",
  "Mint (M)",
  "Near Mint (NM or M-)",
  "Very Good Plus (VG+)",
  "Very Good (VG)",
  "Good Plus (G+)",
  "Good (G)",
  "Fair (F)",
  "Poor (P)",
];

type PreviewState = {
  artist: string;
  title: string;
  year: string;
  format: string;
  discogs_release_id: string;
  purchase_date: string;
  media_condition: string;
  sleeve_condition: string;
  purchase_price: string;
  estimated_value: string;
};

const INITIAL_PREVIEW: PreviewState = {
  artist: "",
  title: "",
  year: "",
  format: "",
  discogs_release_id: "",
  purchase_date: "",
  media_condition: "",
  sleeve_condition: "",
  purchase_price: "",
  estimated_value: "",
};

function displayOrFallback(value: string, fallback: string) {
  return value.trim() !== "" ? value : fallback;
}

export default function AddRecordForm({ onSuccess }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<PreviewState>(INITIAL_PREVIEW);
  const [mode, setMode] = useState("manual");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const previewTitle = useMemo(
    () => displayOrFallback(preview.title, "Untitled Record"),
    [preview.title]
  );

  const previewArtist = useMemo(
    () => displayOrFallback(preview.artist, "Unknown Artist"),
    [preview.artist]
  );

  const previewFormat = useMemo(
    () => displayOrFallback(preview.format, "Format not set"),
    [preview.format]
  );
  async function runSearch() {
    if (!search.trim()) return;

    try {
      const matches = await searchDiscogsMatches(search);
      setResults(matches);
    } catch (err) {
      console.error(err);
    }
  }
  const previewYear = useMemo(
    () => displayOrFallback(preview.year, "Year not set"),
    [preview.year]
  );

  return (
    <section className="w-full max-w-full overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,_rgba(15,23,42,0.92),_rgba(17,24,39,0.9))] p-4 shadow-2xl backdrop-blur-xl sm:p-6">
      <div className="grid min-w-0 grid-cols-1 gap-6">
        <form
          action={async (formData) => {
            setError(null);
            setIsSubmitting(true);

            try {
              await addRecord(formData);
              router.refresh();
              onSuccess?.();
              setPreview(INITIAL_PREVIEW);
            } catch (e: unknown) {
              const message =
                e instanceof Error ? e.message : "Failed to add record.";

              setError(message);
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="min-w-0 rounded-[26px] border border-white/10 bg-black/20 p-5 shadow-xl sm:p-6"
        >
          <div className="mb-6">
<div className="mb-5 flex flex-wrap gap-2">
  {["manual", "discogs", "barcode"].map((m) => (
    <button
      key={m}
      type="button"
      onClick={() => setMode(m)}
      className={`rounded-xl px-4 py-2 text-sm font-semibold ${
        mode === m
          ? "bg-cyan-400 text-slate-950"
          : "bg-slate-800 text-white"
      }`}
    >
      {m}
    </button>
  ))}
</div>
            <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">
              Add Record
            </div>

            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">
              Collector Intake
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Add a new record with collection, pricing, and condition details.
              This layout is designed to feel like a real intake studio instead
              of a plain form.
            </p>
          </div>
{mode === "discogs" && (
  <div className="mb-5 rounded-2xl border border-white/10 p-4">
    <div className="flex gap-2">
<input
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  placeholder="Search Discogs..."
  className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-white"
/>

<button
  type="button"
  onClick={runSearch}
  className="rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950"
>
  Search
</button>


      {results.map((r) => (
        <div
          key={r.id}
          className="rounded-xl border border-white/10 p-3"
        >
          <div className="font-semibold text-white">
            {r.title}
          </div>

          <div className="text-sm text-slate-400">
            {r.year} · {r.format}
          </div>

          <button
            type="button"
            onClick={() => {
              const parts =
                (r.title || "").split(" - ");

              const artist =
                parts.length > 1
                  ? parts[0]
                  : "";

              const album =
                parts.length > 1
                  ? parts.slice(1).join(" - ")
                  : r.title || "";

              setPreview((prev) => ({
                ...prev,
                artist,
                title: album,
                year: r.year || "",
                format: r.format || "",
                discogs_release_id: r.id || "",
              }));
            }}
            className="mt-2 rounded-lg bg-fuchsia-500 px-3 py-2 text-sm text-white"
          >
            Import
          </button>
        </div>
      ))}
    </div>
  </div>
)}

{mode === "barcode" && (
  <div className="mb-5 space-y-3">

    <input
      autoFocus
      value={search}
      onChange={(e) =>
        setSearch(e.target.value)
      }
      onKeyDown={async (e) => {
        if (e.key !== "Enter") return;

        try {
          const matches =
            await searchDiscogsMatches(search);

          setResults(matches);
          setMode("discogs");
        } catch (err) {
          console.error(err);
        }
      }}
      placeholder="Scan with Bluetooth scanner or enter UPC..."
      className="w-full rounded-xl bg-slate-900 px-4 py-3 text-white border border-cyan-500/20"
    />

    <BarcodeScanner
      onScan={async (code) => {
        setSearch(code);
        setMode("discogs");

        try {
          const matches =
            await searchDiscogsMatches(code);

          setResults(matches);
        } catch (err) {
          console.error(err);
        }
      }}
    />
  </div>
)}

          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
            <Field>
              <Label htmlFor="artist">Artist</Label>
              <Input
                id="artist"
                name="artist"
                required
                placeholder="David Bowie"
                value={preview.artist}
                onChange={(e) =>
                  setPreview((prev) => ({ ...prev, artist: e.target.value }))
                }
              />
            </Field>

            <Field>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                required
                placeholder="Heroes"
                value={preview.title}
                onChange={(e) =>
                  setPreview((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </Field>

            <Field>
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                name="year"
                inputMode="numeric"
                placeholder="1977"
                value={preview.year}
                onChange={(e) =>
                  setPreview((prev) => ({ ...prev, year: e.target.value }))
                }
              />
            </Field>

            <Field>
              <Label htmlFor="format">Format</Label>
              <Input
                id="format"
                name="format"
                placeholder='LP, 7", 12"'
                value={preview.format}
                onChange={(e) =>
                  setPreview((prev) => ({ ...prev, format: e.target.value }))
                }
              />
            </Field>

            <Field>
              <Label htmlFor="discogs_release_id">Discogs Release ID</Label>
              <Input
                id="discogs_release_id"
                name="discogs_release_id"
                placeholder="1234567"
                value={preview.discogs_release_id}
                onChange={(e) =>
                  setPreview((prev) => ({
                    ...prev,
                    discogs_release_id: e.target.value,
                  }))
                }
              />
            </Field>

            <Field>
              <Label htmlFor="purchase_date">Purchase Date</Label>
              <Input
                id="purchase_date"
                name="purchase_date"
                type="date"
                value={preview.purchase_date}
                onChange={(e) =>
                  setPreview((prev) => ({
                    ...prev,
                    purchase_date: e.target.value,
                  }))
                }
              />
            </Field>

            <Field>
              <Label htmlFor="media_condition">Media Condition</Label>
              <Select
                id="media_condition"
                name="media_condition"
                value={preview.media_condition}
                onChange={(e) =>
                  setPreview((prev) => ({
                    ...prev,
                    media_condition: e.target.value,
                  }))
                }
              >
                <option value="">Select condition</option>
                {CONDITION_OPTIONS.filter(Boolean).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label htmlFor="sleeve_condition">Sleeve Condition</Label>
              <Select
                id="sleeve_condition"
                name="sleeve_condition"
                value={preview.sleeve_condition}
                onChange={(e) =>
                  setPreview((prev) => ({
                    ...prev,
                    sleeve_condition: e.target.value,
                  }))
                }
              >
                <option value="">Select condition</option>
                {CONDITION_OPTIONS.filter(Boolean).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label htmlFor="purchase_price">Purchase Price</Label>
              <Input
                id="purchase_price"
                name="purchase_price"
                placeholder="19.99"
                value={preview.purchase_price}
                onChange={(e) =>
                  setPreview((prev) => ({
                    ...prev,
                    purchase_price: e.target.value,
                  }))
                }
              />
            </Field>

            <Field>
              <Label htmlFor="estimated_value">Estimated Value</Label>
              <Input
                id="estimated_value"
                name="estimated_value"
                placeholder="35.00"
                value={preview.estimated_value}
                onChange={(e) =>
                  setPreview((prev) => ({
                    ...prev,
                    estimated_value: e.target.value,
                  }))
                }
              />
            </Field>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs leading-6 text-slate-400">
              Condition and value fields are now part of the workflow.
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-300 to-fuchsia-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Adding..." : "Add Record"}
            </button>
          </div>
        </form>

        <aside className="min-w-0 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,_rgba(15,23,42,0.84),_rgba(30,41,59,0.82))] p-5 shadow-xl">
          <div className="inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-fuchsia-200">
            Live Preview
          </div>

          <div className="mt-4 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/20 shadow-2xl">
            <div className="border-b border-white/10 p-5">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-[22px] border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Cover
                  <br />
                  Preview
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone="cyan" label={previewFormat} />
                    <StatusPill tone="violet" label={previewYear} />
                  </div>

                  <div className="mt-4 truncate text-xl font-semibold leading-tight text-white">
                    {previewTitle}
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-300">
                    {previewArtist}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-5">
              <PreviewPanel
                title="Collector Snapshot"
                items={[
                  {
                    label: "Purchase Price",
                    value: displayOrFallback(
                      preview.purchase_price,
                      "Not entered"
                    ),
                  },
                  {
                    label: "Estimated Value",
                    value: displayOrFallback(
                      preview.estimated_value,
                      "Not entered"
                    ),
                  },
                  {
                    label: "Media",
                    value: displayOrFallback(preview.media_condition, "Not set"),
                  },
                  {
                    label: "Sleeve",
                    value: displayOrFallback(preview.sleeve_condition, "Not set"),
                  },
                ]}
              />

              <PreviewPanel
                title="Catalog Details"
                items={[
                  {
                    label: "Discogs ID",
                    value: displayOrFallback(
                      preview.discogs_release_id,
                      "Not entered"
                    ),
                  },
                  {
                    label: "Purchase Date",
                    value: displayOrFallback(
                      preview.purchase_date,
                      "Not entered"
                    ),
                  },
                ]}
              />

              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-300">
                  Quick Guidance
                </div>

                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                  <li>
                    Use Discogs Release ID when known for the cleanest cover
                    workflow.
                  </li>
                  <li>
                    Condition plus value fields make later review and pricing
                    easier.
                  </li>
                  <li>
                    Think of this panel as your intake checkpoint before saving.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Field({ children }: { children: ReactNode }) {
  return <div className="min-w-0">{children}</div>;
}

function Label({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400"
    >
      {children}
    </label>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full min-w-0 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/35"
    />
  );
}

function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full min-w-0 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/35"
    />
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "cyan" | "violet";
}) {
  const styles =
    tone === "cyan"
      ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
      : "border border-violet-400/20 bg-violet-400/10 text-violet-100";

  return (
    <span
      className={`max-w-full truncate rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${styles}`}
    >
      {label}
    </span>
  );
}

function PreviewPanel({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: string }[];
}) {
  return (
    <div className="min-w-0 rounded-[22px] border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-300">
        {title}
      </div>

      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex min-w-0 items-start justify-between gap-4 border-b border-white/5 pb-2 text-sm last:border-b-0 last:pb-0"
          >
            <span className="shrink-0 text-slate-400">{item.label}</span>
            <span className="min-w-0 truncate text-right font-medium text-slate-100">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
