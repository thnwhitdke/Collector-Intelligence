"use client";

import { useState } from "react";
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

      {open ? (
        <div className="fixed inset-0 z-[9999]">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-[#3A3328] bg-[#11100E] text-[#F4EFE6] shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-[#3A3328] bg-[#11100E]/95 px-6 py-5 backdrop-blur">
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

            <div className="p-6">
              <div className="rounded-[28px] border border-[#3A3328] bg-[#1A1815] p-4">
                <AddRecordForm onSuccess={() => setOpen(false)} />
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}