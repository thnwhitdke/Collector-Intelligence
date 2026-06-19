"use client";

export default function DeleteRecordButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        const confirmed = window.confirm(
          "Delete this record permanently?\n\nThis action cannot be undone."
        );

        if (!confirmed) {
          e.preventDefault();
        }
      }}
      className="w-full rounded-2xl border border-red-500/25 bg-red-500/10 px-5 py-4 text-sm font-black text-red-100"
    >
      Delete Record
    </button>
  );
}
