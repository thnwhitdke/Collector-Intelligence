import Link from "next/link";
import { createAdminClient } from "@/src/lib/supabase/admin";

type Props = {
  userId: string | null;
};

function money(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatArtistName(name: string | null | undefined) {
  const trimmed = String(name || "").trim();
  if (!trimmed.includes(",")) return trimmed;

  const [last, ...rest] = trimmed.split(",");
  const first = rest.join(",").trim();

  return `${first} ${last}`.replace(/\s+/g, " ").trim();
}

function deltaText(current: number | null, previous: number | null, label: string) {
  if (current === null || previous === null || current === previous) return null;

  const diff = current - previous;
  const direction = diff > 0 ? "+" : "";

  return `${label} ${direction}${diff}`;
}

function priceDelta(current: number | null, previous: number | null) {
  if (!current || !previous || current === previous) return null;

  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  const direction = diff > 0 ? "+" : "";

  return `Price ${direction}${pct}%`;
}

export default async function WantAlertFeed({ userId }: Props) {
  if (!userId) return null;

  const supabase = createAdminClient();

  const { data: history } = await supabase
    .from("want_market_history")
    .select("id, want_id, signal, captured_at, lowest_price, for_sale, want_count, have_count, marketplace_url")
    .eq("user_id", userId)
    .not("signal", "is", null)
    .order("captured_at", { ascending: false })
    .limit(80);

  if (!history?.length) return null;

  const latestByWant = new Map<number, any>();
  const previousByWant = new Map<number, any>();

  for (const row of history) {
    if (!latestByWant.has(row.want_id)) {
      latestByWant.set(row.want_id, row);
    } else if (!previousByWant.has(row.want_id)) {
      previousByWant.set(row.want_id, row);
    }
  }

  const latestRows = Array.from(latestByWant.values()).slice(0, 4);
  const wantIds = latestRows.map((h) => h.want_id);

  const { data: wants } = await supabase
    .from("want_list")
    .select("id, artist, title, marketplace_url, record_id")
    .in("id", wantIds);

  const wantMap = new Map((wants || []).map((w) => [w.id, w]));

  return (
    <section className="mt-8 rounded-[30px] border border-red-500/20 bg-gradient-to-br from-[#170B0B] via-[#100908] to-[#080605] p-5 shadow-[0_12px_50px_rgba(180,20,20,.12)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-red-300">
            Breaking Want Intelligence
          </p>

          <h2 className="mt-2 text-2xl font-black text-[#F6E7C8]">
            Acquisition Alerts
          </h2>
        </div>

        <p className="text-xs uppercase tracking-[0.2em] text-red-200/70">
          {latestRows.length} priority signals
        </p>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {latestRows.map((row) => {
          const previous = previousByWant.get(row.want_id);
          const want = wantMap.get(row.want_id);

          const supplyDelta = deltaText(
            row.for_sale ?? null,
            previous?.for_sale ?? null,
            "Supply",
          );

          const demandDelta = deltaText(
            row.want_count ?? null,
            previous?.want_count ?? null,
            "Wants",
          );

          const priceMove = priceDelta(
            row.lowest_price ?? null,
            previous?.lowest_price ?? null,
          );

          const marketplace =
            row.marketplace_url || want?.marketplace_url || null;

          return (
            <div
              key={row.id}
              className="rounded-3xl border border-white/10 bg-black/25 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-red-200">
                    {row.signal}
                  </p>

                  <p className="mt-1 text-sm font-bold text-[#F6E7C8]">
                    {formatArtistName(want?.artist)} — {want?.title || `Want #${row.want_id}`}
                  </p>
                </div>

                <p className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-[#8F8170]">
                  {new Date(row.captured_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="uppercase tracking-[0.18em] text-[#8F8170]">
                    Price
                  </p>
                  <p className="mt-1 font-black text-white">
                    {money(row.lowest_price)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="uppercase tracking-[0.18em] text-[#8F8170]">
                    For Sale
                  </p>
                  <p className="mt-1 font-black text-white">
                    {row.for_sale ?? "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="uppercase tracking-[0.18em] text-[#8F8170]">
                    Demand
                  </p>
                  <p className="mt-1 font-black text-white">
                    {row.want_count ?? "—"}/{row.have_count ?? "—"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {[priceMove, supplyDelta, demandDelta].filter(Boolean).map((note) => (
                  <span
                    key={note}
                    className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-bold text-amber-100"
                  >
                    {note}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`#want-${row.want_id}`}
                  className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs font-black text-cyan-100"
                >
                  View Target
                </Link>

                {marketplace ? (
                  <a
                    href={marketplace}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-[#4A3A1E] bg-[#15110C] px-4 py-2 text-xs font-black text-[#D8B65A]"
                  >
                    Marketplace
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
