"use client";

import { useState } from "react";
import AddRecordForm from "../components/AddRecordForm";

type RecordRow = {
  id: string;
  artist: string | null;
  title: string | null;
  year: number | null;
  format: string | null;
  rating: number | null;
  created_at: string;
};

export default function CollectionUI({
  email,
  records,
  error,
  initialQuery,
}: {
  email: string;
  records: RecordRow[];
  error: string | null;
  initialQuery: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(initialQuery ?? "");

  function goSearch() {
    const cleaned = q.trim();
    if (cleaned) {
      window.location.assign(`/collection?q=${encodeURIComponent(cleaned)}`);
    } else {
      window.location.assign(`/collection`);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Collection</h1>
        <button onClick={() => setOpen(true)}>+ Add</button>
      </div>

      <p style={{ marginTop: 8, opacity: 0.8 }}>Signed in as: {email}</p>

      {/* SEARCH — ENTER KEY TRIGGERS NAVIGATION */}
      <div style={{ marginTop: 16 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              goSearch();
            }
          }}
          placeholder="Search albums, artists, pressings..."
          style={{
            width: "100%",
            padding: 10,
            border: "1px solid #ddd",
            borderRadius: 6,
          }}
        />
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <button type="button" onClick={goSearch}>
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setQ("");
              window.location.assign(`/collection`);
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && <pre style={{ color: "crimson", marginTop: 12 }}>{error}</pre>}

      {/* GRID */}
      <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
        {records.map((r) => (
          <div
            key={r.id}
            style={{
              border: "1px solid #eee",
              borderRadius: 8,
              padding: 12,
              width: 260,
            }}
          >
            <div style={{ fontWeight: 700 }}>{r.artist ?? "Unknown artist"}</div>
            <div>{r.title ?? "Untitled"}</div>
            <div style={{ color: "#666", marginTop: 6 }}>
              {r.year ?? "—"} · {r.format ?? "—"} · rating: {r.rating ?? "—"}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              background: "white",
              padding: 24,
              borderRadius: 12,
              width: 420,
              maxWidth: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <AddRecordForm />
          </div>
        </div>
      )}
    </main>
  );
}