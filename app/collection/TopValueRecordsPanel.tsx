// app/collection/TopValueRecordsPanel.tsx

import Image from "next/image";
import Link from "next/link";
import type { ValueRankingRecord } from "../actions/value-rankings";

type Props = {
  topEstimated: ValueRankingRecord[];
  biggestGainers: ValueRankingRecord[];
  needsValuePull: ValueRankingRecord[];
};

function money(value: number | null) {
  if (value === null) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function consensusValue(record: ValueRankingRecord) {
  if (record.market_consensus_value !== null && record.market_consensus_value > 0) {
    return record.market_consensus_value;
  }

  if (record.estimated_value !== null && record.estimated_value > 0) {
    return record.estimated_value;
  }

  if (record.discogs_median_price !== null && record.discogs_median_price > 0) {
    return record.discogs_median_price;
  }

  return null;
}

function gain(record: ValueRankingRecord) {
  const value = consensusValue(record);

  if (value === null || record.purchase_price === null) {
    return null;
  }

  return value - record.purchase_price;
}

export default function TopValueRecordsPanel({
  topEstimated,
  biggestGainers,
  needsValuePull,
}: Props) {
  return (
    <section className="mx-auto max-w-7xl px-6 pt-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <RankingColumn
          eyebrow="Market Leaders"
          title="Top Market Consensus"
          records={topEstimated}
          mode="estimated"
        />

        <RankingColumn
          eyebrow="Portfolio Delta"
          title="Biggest Gainers"
          records={biggestGainers}
          mode="gain"
        />

        <RankingColumn
          eyebrow="Data Quality"
          title="Needs Value Pull"
          records={needsValuePull}
          mode="missing"
        />
      </div>
    </section>
  );
}

function RankingColumn({
  eyebrow,
  title,
  records,
  mode,
}: {
  eyebrow: string;
  title: string;
  records: ValueRankingRecord[];
  mode: "estimated" | "gain" | "missing";
}) {
  return (
    <article className="rounded-3xl border border-[#3A3328] bg-[#1A1815] p-5 text-[#F4EFE6] shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8E8170]">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-xl font-semibold tracking-tight">{title}</h2>

      <div className="mt-5 space-y-3">
        {records.length === 0 ? (
          <div className="rounded-2xl border border-[#3A3328] bg-[#11100E] p-4 text-sm text-[#8E8170]">
            No records yet.
          </div>
        ) : (
          records.map((record, index) => (
            <RankingRow
              key={record.id}
              record={record}
              index={index}
              mode={mode}
            />
          ))
        )}
      </div>
    </article>
  );
}

function RankingRow({
  record,
  index,
  mode,
}: {
  record: ValueRankingRecord;
  index: number;
  mode: "estimated" | "gain" | "missing";
}) {
  const gainValue = gain(record);

  const valueLabel =
    mode === "estimated"
      ? money(consensusValue(record))
      : mode === "gain"
        ? gainValue === null
          ? "—"
          : `${gainValue >= 0 ? "+" : ""}${money(gainValue)}`
        : "Pull needed";

  return (
    <Link
      href={`/collection/${record.id}`}
      className="group flex gap-3 rounded-2xl border border-[#3A3328] bg-[#11100E] p-3 transition hover:border-[#C7A45D] hover:bg-[#171410]"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#3A3328] text-xs font-semibold text-[#C7A45D]">
        {index + 1}
      </div>

      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#3A3328] bg-black">
        {record.cover_url ? (
          <Image
            src={record.cover_url}
            alt={`${record.artist ?? "Unknown Artist"} - ${
              record.title ?? "Untitled"
            }`}
            width={96}
            height={96}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-[#8E8170]">
            No Cover
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#F4EFE6]">
          {record.title || "Untitled"}
        </p>
        <p className="truncate text-xs text-[#B8AA96]">
          {record.artist || "Unknown Artist"}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-[#C7A45D]">{valueLabel}</p>
        {mode === "gain" ? (
          <p className="text-xs text-[#8E8170]">
            consensus {money(consensusValue(record))}
          </p>
        ) : null}
      </div>
    </Link>
  );
}