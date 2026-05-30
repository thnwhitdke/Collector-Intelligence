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

function buildUsefulHeadline(row: any, previous: any) {
  const currentForSale = row.for_sale ?? null;
  const previousForSale = previous?.for_sale ?? null;
  const currentPrice = row.lowest_price ?? null;
  const previousPrice = previous?.lowest_price ?? null;
  const currentWant = row.want_count ?? null;
  const previousWant = previous?.want_count ?? null;

  if (previousForSale === 0 && currentForSale && currentForSale > 0) {
    return "🚨 New marketplace copy appeared";
  }

  if (previousPrice && currentPrice && currentPrice < previousPrice) {
    const pct = Math.round(((previousPrice - currentPrice) / previousPrice) * 100);
    return `📉 Price dropped ${pct}%`;
  }

  if (
    previousForSale !== null &&
    currentForSale !== null &&
    currentForSale < previousForSale
  ) {
    return `🔥 Supply tightened from ${previousForSale} to ${currentForSale}`;
  }

  if (
    previousWant !== null &&
    currentWant !== null &&
    currentWant > previousWant
  ) {
    return `📈 Demand increased by ${currentWant - previousWant}`;
  }

  if (currentForSale === 0) {
    return "⚠ No copies currently for sale";
  }

  if (currentForSale !== null && currentForSale <= 2) {
    return `⚠ Only ${currentForSale} currently for sale`;
  }

  return "Market checked";
}

function buildInsight(row: any, previous: any) {
  const pieces = [];

  if (previous?.lowest_price && row.lowest_price && row.lowest_price !== previous.lowest_price) {
    pieces.push(`Price ${money(previous.lowest_price)} → ${money(row.lowest_price)}`);
  }

  if (
    previous?.for_sale !== undefined &&
    previous?.for_sale !== null &&
    row.for_sale !== undefined &&
    row.for_sale !== null &&
    row.for_sale !== previous.for_sale
  ) {
    pieces.push(`Supply ${previous.for_sale} → ${row.for_sale}`);
  }

  if (
    previous?.want_count !== undefined &&
    previous?.want_count !== null &&
    row.want_count !== undefined &&
    row.want_count !== null &&
    row.want_count !== previous.want_count
  ) {
    pieces.push(`Wants ${previous.want_count} → ${row.want_count}`);
  }

  if (!pieces.length) {
    pieces.push(`${row.want_count ?? "—"} want / ${row.have_count ?? "—"} have`);
  }

  return pieces.join(" · ");
}

export default async function WantAlertFeed({ userId }: Props) {
  if (!userId) return null;

  const supabase = createAdminClient();

  const { data: history } = await supabase
    .from("want_market_history")
    .select("id, want_id, signal, captured_at, lowest_price, for_sale, want_count, have_count, marketplace_url")
    .eq("user_id", userId)
    .order("captured_at", { ascending: false })
    .limit(120);

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

  const latestRows = Array.from(latestByWant.values()).slice(0, 3);
  const wantIds = latestRows.map((h) => h.want_id);

  const { data: wants } = await supabase
    .from("want_list")
    .select("id, artist, title, cover_url, marketplace_url, discogs_url, record_id")
    .in("id", wantIds);

  const wantMap = new Map((wants || []).map((w) => [w.id, w]));

  return (
    <section className="mt-8 rounded-[30px] border border-red-500/20 bg-gradient-to-br from-[#170B0B] via-[#100908] to-[#080605] p-5 shadow-[0_12px_50px_rgba(180,20,20,.12)]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-red-300">
            Breaking Want Intelligence
          </p>

          <h2 className="mt-2 text-2xl font-black text-[#F6E7C8]">
            Acquisition Watch
          </h2>

          <p className="mt-1 text-sm text-[#A99678]">
            Latest price, supply, and demand movement across your want targets.
          </p>
        </div>

        <p className="text-xs uppercase tracking-[0.2em] text-red-200/70">
          {latestRows.length} alerts
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        {latestRows.map((row) => {
          const previous = previousByWant.get(row.want_id);
          const want = wantMap.get(row.want_id);
          const marketplace = row.marketplace_url || want?.marketplace_url || null;

          return (
            <div
              key={row.id}
              className="grid gap-4 rounded-3xl border border-white/10 bg-black/25 p-4 md:grid-cols-[72px_1fr_auto]"
            >
              <div>
                {want?.cover_url ? (
                  <img
                    src={want.cover_url}
                    alt={want.title || "Want target"}
                    className="h-[72px] w-[72px] rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-xs text-[#8F8170]">
                    No Art
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-black text-red-200">
                  {buildUsefulHeadline(row, previous)}
                </p>

                <p className="mt-1 text-base font-black text-[#F6E7C8]">
                  {formatArtistName(want?.artist)} — {want?.title || `Want #${row.want_id}`}
                </p>

                <p className="mt-2 text-sm text-[#BCA98A]">
                  {buildInsight(row, previous)}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                    Price {money(row.lowest_price)}
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                    For sale {row.for_sale ?? "—"}
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                    Demand {row.want_count ?? "—"}/{row.have_count ?? "—"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 md:items-end">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#8F8170]">
                  {new Date(row.captured_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>

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
