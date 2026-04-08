"use client";

import { useState } from "react";
import AddRecordForm from "../components/AddRecordForm";

type RecordRow = {
  id: string;
  artist: string;
  title: string;
  year: number | null;
  format: string | null;
  rating: number | null;
  created_at: string;
};

export default function CollectionUI({
  email,
  records,
  error,
}: {
  email: string;
  records: RecordRow[];
  error: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Collection</h1>
        <button onClick={() => setOpen(true)}>+ Add</button>
      </div>

      <p style={{ marginTop: 8 }}>Signed in as: {email}</p>

      <input
        placeholder="Search albums, artists, pressings..."
        style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}
      />

      {error && <pre style={{ color: "crimson" }}>{error}</pre>}

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
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
            <div style={{ fontWeight: 700 }}>{r.artist}</div>
            <div>{r.title}</div>
            <div style={{ color: "#666", marginTop: 6 }}>
              {r.year ?? "—"} · {r.format ?? "—"} · rating: {r.rating ?? "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              background: "white",
              borderRadius: 12,
              padding: 16,
              border: "1px solid #eee",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>Add item</strong>
              <button onClick={() => setOpen(false)}>Close</button>
            </div>

            <AddRecordForm onSuccess={() => setOpen(false)} />
          </div>
        </div>
      )}
    </main>
  );
}