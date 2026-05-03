// app/components/ValueIntelligenceCard.tsx

import { calculateValueIntelligence, type ValueInput } from "../../src/lib/value-intelligence";

type ValueIntelligenceCardProps = {
  valueInput: ValueInput;
};

function money(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function ValueIntelligenceCard({ valueInput }: ValueIntelligenceCardProps) {
  const result = calculateValueIntelligence(valueInput);

  return (
    <section className="rounded-3xl border border-[#2A2418] bg-[#11100D] p-5 shadow-xl">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.25em] text-[#D8B65A]">
            Value Intelligence
          </p>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-black text-white">
                {money(result.estimatedValue)}
              </p>
              <p className="mt-1 text-sm text-zinc-400">Estimated collector value</p>
            </div>

            <div className="rounded-2xl border border-[#3A3020] bg-black/30 px-4 py-3 text-right">
              <p className="text-2xl font-black text-[#D8B65A]">
                {result.confidenceScore}/100
              </p>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Confidence
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#332A1C] bg-[#18150F] p-4">
          <p className="text-sm font-bold text-white">{result.signal}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{result.insight}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#2A2418] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Discogs</p>
            <p className="mt-2 text-xl font-black text-white">
              {money(result.sourceSummary.discogs)}
            </p>
          </div>

          <div className="rounded-2xl border border-[#2A2418] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              eBay Sold
            </p>
            <p className="mt-2 text-xl font-black text-white">
              {money(result.sourceSummary.ebay)}
            </p>
          </div>

          <div className="rounded-2xl border border-[#2A2418] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Manual Comp
            </p>
            <p className="mt-2 text-xl font-black text-white">
              {money(result.sourceSummary.manual)}
            </p>
          </div>

          <div className="rounded-2xl border border-[#2A2418] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Purchase
            </p>
            <p className="mt-2 text-xl font-black text-white">
              {money(result.sourceSummary.purchasePrice)}
            </p>
          </div>
        </div>

        {result.badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {result.badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-[#4A3A1E] bg-[#1B160E] px-3 py-1 text-xs font-bold text-[#D8B65A]"
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
