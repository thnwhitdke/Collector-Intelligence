type PriceHistoryPoint = {
  date: string;
  value: number;
  source: string;
};

function normalizeHistory(history: PriceHistoryPoint[] | null) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (point) =>
        point &&
        typeof point.date === "string" &&
        typeof point.value === "number"
    )
    .slice(-12);
}

export default function ValueSparkline({
  history,
}: {
  history: PriceHistoryPoint[] | null;
}) {
  const points = normalizeHistory(history);

  if (points.length < 2) {
    return <span className="text-xs text-slate-500">Need 2 pulls</span>;
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coordinates = points.map((point, index) => {
    const x = (index / (points.length - 1)) * 100;
    const y = 32 - ((point.value - min) / range) * 28;

    return `${x},${y}`;
  });

  const first = values[0];
  const last = values[values.length - 1];
  const trend = last - first;

  return (
    <div className="flex items-center justify-end gap-3">
      <svg
        viewBox="0 0 100 36"
        className="h-9 w-24 overflow-visible"
        role="img"
        aria-label="Value trend sparkline"
      >
        <polyline
          points={coordinates.join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={trend >= 0 ? "text-emerald-300" : "text-rose-300"}
        />
      </svg>

      <span
        className={`text-xs font-bold ${
          trend >= 0 ? "text-emerald-300" : "text-rose-300"
        }`}
      >
        {trend >= 0 ? "Rising" : "Falling"}
      </span>
    </div>
  );
}