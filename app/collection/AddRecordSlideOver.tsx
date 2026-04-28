"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AddRecordForm from "../components/AddRecordForm";

type Props = {
  showDuplicatesOnly: boolean;
  setShowDuplicatesOnly: (value: boolean) => void;
  duplicateCount: number;
};

export default function AddRecordSlideOver({
  showDuplicatesOnly,
  setShowDuplicatesOnly,
  duplicateCount,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const drawer =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[2147483647]">
            <button
              type="button"
              aria-label="Close add record drawer"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <aside className="absolute right-0 top-0 flex h-screen w-full max-w-6xl flex-col overflow-hidden border-l border-[#3A3328] bg-[#11100E] text-[#F4EFE6] shadow-2xl">
              <div className="shrink-0 border-b border-[#3A3328] bg-[#11100E]/95 px-6 py-5 backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C7A45D]">
                      Collector Archive
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold text-[#F4EFE6]">
                      Add Record
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-[#3A3328] px-4 py-2 text-sm font-medium text-[#F4EFE6] transition hover:bg-[#1A1815]"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <AddRecordForm onSuccess={() => setOpen(false)} />
              </div>
            </aside>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-2xl bg-gradient-to-r from-[#C7A45D] to-[#8F6F35] px-5 py-3 text-sm font-semibold text-[#11100E] transition hover:opacity-90"
        >
          + Add Record
        </button>

        <button
          type="button"
          onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
            showDuplicatesOnly
              ? "border-yellow-300/40 bg-yellow-300 text-[#11100E]"
              : "border-[#3A3328] bg-[#221F1A]/70 text-[#F4EFE6] hover:border-[#C7A45D]/45"
          }`}
        >
          {showDuplicatesOnly ? "Showing Duplicates" : "Show Duplicates Only"}
        </button>

        <div className="text-sm text-[#B8AA96]">
          {duplicateCount} possible duplicates
        </div>
      </div>

      {drawer}
    </>
  );
}
