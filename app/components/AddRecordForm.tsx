"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addRecord } from "../actions/records";

type Props = {
  onSuccess?: () => void;
};

export default function AddRecordForm({ onSuccess }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      action={async (formData) => {
        setError(null);
        setIsSubmitting(true);

        try {
          await addRecord(formData);

          // 1) refresh the server page so the new record appears
          router.refresh();

          // 2) close the modal (parent controls modal open/close)
          onSuccess?.();
        } catch (e: any) {
          setError(e?.message ?? "Failed to add record.");
        } finally {
          setIsSubmitting(false);
        }
      }}
      style={{
        marginTop: 16,
        padding: 16,
        border: "1px solid #ddd",
        borderRadius: 8,
        background: "white",
        maxWidth: 420,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Add a record</h3>

      <div style={{ marginTop: 12 }}>
        <label>
          Artist
          <input
            name="artist"
            required
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>
          Title
          <input
            name="title"
            required
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>
          Year
          <input
            name="year"
            inputMode="numeric"
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>
          Format
          <input
            name="format"
            placeholder="LP, 7&quot;, 12&quot;..."
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>
          Rating (1–10)
          <input
            name="rating"
            inputMode="numeric"
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
      </div>

      {error && (
        <p style={{ marginTop: 12, color: "crimson" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        style={{ marginTop: 12 }}
      >
        {isSubmitting ? "Adding..." : "Add"}
      </button>
    </form>
  );
}