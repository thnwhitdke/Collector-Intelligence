// app/components/ManualValueCompForm.tsx

import { updateManualValueComp } from "../actions/value-intelligence";

type ManualValueCompFormProps = {
  recordId: string;
  currentValues?: {
    manualCompPrice?: number | null;
    manualCompNote?: string | null;
    ebayLastSoldPrice?: number | null;
    ebayAvgSoldPrice?: number | null;
    ebaySoldCount?: number | null;
    ebayCompUrl?: string | null;
    conditionGrade?: string | null;
  };
};

function valueOrEmpty(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export default function ManualValueCompForm({
  recordId,
  currentValues,
}: ManualValueCompFormProps) {
  return (
    <section className="rounded-3xl border border-[#2A2418] bg-[#11100D] p-5 shadow-xl">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.25em] text-[#D8B65A]">
          Market Evidence
        </p>
        <h2 className="mt-2 text-2xl font-black text-white">
          Add eBay / Manual Comp Data
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Use this when you find a sold eBay listing, a trusted market reference, or
          a confirmed manual comp.
        </p>
      </div>

      <form action={updateManualValueComp} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="recordId" value={recordId} />

        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-zinc-300">Manual comp price</span>
          <input
            name="manualCompPrice"
            type="number"
            step="0.01"
            defaultValue={valueOrEmpty(currentValues?.manualCompPrice)}
            className="rounded-2xl border border-[#3A3020] bg-black px-4 py-3 text-white outline-none focus:border-[#D8B65A]"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-zinc-300">Condition grade</span>
          <select
            name="conditionGrade"
            defaultValue={valueOrEmpty(currentValues?.conditionGrade)}
            className="rounded-2xl border border-[#3A3020] bg-black px-4 py-3 text-white outline-none focus:border-[#D8B65A]"
          >
            <option value="">Select grade</option>
            <option value="Sealed">Sealed</option>
            <option value="Mint">Mint</option>
            <option value="NM">NM</option>
            <option value="VG+">VG+</option>
            <option value="VG">VG</option>
            <option value="G+">G+</option>
            <option value="G">G</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-zinc-300">eBay last sold price</span>
          <input
            name="ebayLastSoldPrice"
            type="number"
            step="0.01"
            defaultValue={valueOrEmpty(currentValues?.ebayLastSoldPrice)}
            className="rounded-2xl border border-[#3A3020] bg-black px-4 py-3 text-white outline-none focus:border-[#D8B65A]"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-zinc-300">eBay average sold price</span>
          <input
            name="ebayAvgSoldPrice"
            type="number"
            step="0.01"
            defaultValue={valueOrEmpty(currentValues?.ebayAvgSoldPrice)}
            className="rounded-2xl border border-[#3A3020] bg-black px-4 py-3 text-white outline-none focus:border-[#D8B65A]"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-zinc-300">eBay sold count</span>
          <input
            name="ebaySoldCount"
            type="number"
            step="1"
            defaultValue={valueOrEmpty(currentValues?.ebaySoldCount)}
            className="rounded-2xl border border-[#3A3020] bg-black px-4 py-3 text-white outline-none focus:border-[#D8B65A]"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-zinc-300">eBay comp URL</span>
          <input
            name="ebayCompUrl"
            type="url"
            defaultValue={valueOrEmpty(currentValues?.ebayCompUrl)}
            className="rounded-2xl border border-[#3A3020] bg-black px-4 py-3 text-white outline-none focus:border-[#D8B65A]"
          />
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm font-bold text-zinc-300">Manual comp note</span>
          <textarea
            name="manualCompNote"
            rows={4}
            defaultValue={valueOrEmpty(currentValues?.manualCompNote)}
            className="rounded-2xl border border-[#3A3020] bg-black px-4 py-3 text-white outline-none focus:border-[#D8B65A]"
          />
        </label>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-2xl bg-[#D8B65A] px-5 py-3 text-sm font-black text-black hover:opacity-90"
          >
            Save Value Intelligence
          </button>
        </div>
      </form>
    </section>
  );
}
