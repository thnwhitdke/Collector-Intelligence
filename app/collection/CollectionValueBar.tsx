// app/collection/CollectionValueBar.tsx

type Props = {
  totalEstimatedValue: number;
  totalPurchaseValue: number;
  totalGainLoss: number;
  totalRecords: number;
  missingValueCount: number;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function CollectionValueBar({
  totalEstimatedValue,
  totalPurchaseValue,
  totalGainLoss,
  totalRecords,
  missingValueCount,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card title="Total Collection Value" value={money(totalEstimatedValue)} />
      <Card title="Total Purchase Cost" value={money(totalPurchaseValue)} />
      <Card
        title="Gain / Loss"
        value={`${totalGainLoss >= 0 ? "+" : ""}${money(totalGainLoss)}`}
        highlight
      />
      <Card
        title="Missing Value Data"
        value={`${missingValueCount} / ${totalRecords}`}
        subtle
      />
    </div>
  );
}

function Card({
  title,
  value,
  highlight,
  subtle,
}: {
  title: string;
  value: string;
  highlight?: boolean;
  subtle?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm ${
        highlight
          ? "border-stone-950 bg-stone-950 text-stone-50"
          : subtle
          ? "border-stone-300 bg-stone-100 text-stone-700"
          : "border-stone-300 bg-[#f7f1e8]"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.2em] opacity-70">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}