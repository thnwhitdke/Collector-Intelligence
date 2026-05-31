// app/collection/want-list/page.tsx

export const dynamic = "force-dynamic";

import Link from "next/link";
import CINavigation from "@/app/components/CINavigation";
import WantAlertFeed from "@/app/components/WantAlertFeed";
import {
  addDiscogsReleaseToWantList,
  deleteWantListItem,
  getWantList,
  markWantListItemPurchased,
  refreshWantListItem,
} from "../../actions/want-list";

type WantItem = Awaited<ReturnType<typeof getWantList>>[number] & {
  rarity_score?: number | null;
  demand_score?: number | null;
  acquisition_pressure?: number | null;
  market_signal?: string | null;
  sync_status?: string | null;
  last_sync_at?: string | null;
  sync_error?: string | null;
};

function money(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function compactDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function score(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return String(Math.round(Number(value)));
}

function scoreNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 0;
  }

  return Math.round(Number(value));
}

function priorityClass(priority: string | null | undefined) {
  switch (priority) {
    case "High":
      return "border-red-500/30 bg-red-500/10 text-red-200";
    case "Low":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  }
}

function signalClass(signal: string | null | undefined) {
  if (!signal) return "border-[#3A3025] bg-[#100D09] text-[#D8C39B]";

  if (signal.includes("Ultra Rare")) {
    return "border-red-400/40 bg-red-500/15 text-red-100";
  }

  if (signal.includes("Rare Demand")) {
    return "border-orange-400/40 bg-orange-500/15 text-orange-100";
  }

  if (signal.includes("Severe")) {
    return "border-amber-400/40 bg-amber-500/15 text-amber-100";
  }

  if (signal.includes("Demand")) {
    return "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-100";
  }

  if (signal.includes("Opportunity")) {
    return "border-emerald-400/40 bg-emerald-500/15 text-emerald-100";
  }

  return "border-[#3A3025] bg-[#100D09] text-[#D8C39B]";
}

function syncClass(status: string | null | undefined) {
  if (status === "synced") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }

  if (status === "degraded") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  }

  return "border-[#3A3025] bg-[#100D09] text-[#9C8D78]";
}

function pressureLabel(value: number | null | undefined) {
  const pressure = scoreNumber(value);

  if (pressure >= 88) return "Critical Acquisition";
  if (pressure >= 75) return "Priority Watch";
  if (pressure >= 60) return "Active Monitor";
  if (pressure >= 35) return "Developing Signal";

  return "Low Pressure";
}

function rarityLabel(value: number | null | undefined) {
  const rarity = scoreNumber(value);

  if (rarity >= 95) return "Ultra Rare";
  if (rarity >= 85) return "Rare";
  if (rarity >= 65) return "Scarce";
  if (rarity >= 40) return "Limited";

  return "Available";
}

function demandLabel(value: number | null | undefined) {
  const demand = scoreNumber(value);

  if (demand >= 90) return "Fever Demand";
  if (demand >= 75) return "High Demand";
  if (demand >= 55) return "Balanced Demand";
  if (demand >= 35) return "Soft Demand";

  return "Low Demand";
}

function parseCommunity(notes: string | null | undefined) {
  if (!notes) return null;

  const match = notes.match(/(\d+)\s+have\s+\/\s+(\d+)\s+want/i);
  if (!match) return null;

  return {
    have: Number(match[1]),
    want: Number(match[2]),
  };
}

function intelligenceNarrative(item: WantItem) {
  const signal = item.market_signal ?? "Market Monitored";
  const pressure = scoreNumber(item.acquisition_pressure);
  const forSale = item.marketplace_for_sale_count ?? 0;
  const price = item.marketplace_lowest_price;

  if (signal.includes("Ultra Rare")) {
    return "This target is showing a rare collision of constrained supply, strong collector demand, and high acquisition pressure.";
  }

  if (signal.includes("Rare Demand")) {
    return "Collector demand and scarcity are converging. This is a serious watch target even if no current listing is available.";
  }

  if (signal.includes("Severe")) {
    return "Supply is extremely constrained. The market may be dormant, seller-limited, or genuinely scarce.";
  }

  if (price && price >= 1000) {
    return "This is a high-cost acquisition target. Price discipline and timing matter more than speed.";
  }

  if (forSale >= 25) {
    return "Supply is available. This target may benefit from patience, comparison shopping, and condition discipline.";
  }

  if (pressure >= 60) {
    return "This target has enough pressure to justify active monitoring.";
  }

  return "This target is being monitored, but current signals do not suggest urgency.";
}

function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[30px] border border-[#30261B] bg-[#0F0C09] p-5 shadow-[0_18px_60px_rgba(0,0,0,.28)]">
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#8F806C]">
        {label}
      </p>
      <p className={accent ? "mt-3 text-3xl font-black text-[#D8B65A]" : "mt-3 text-3xl font-black text-[#F4EFE6]"}>
        {value}
      </p>
      {sub ? <p className="mt-2 text-xs text-[#8F806C]">{sub}</p> : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7F7364]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[#D8C39B]">
        {value || "—"}
      </p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#2E2418] bg-[#090705] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7F7364]">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-[#F4EFE6]">{value}</p>
    </div>
  );
}

function ScoreBar({ value }: { value: number | null | undefined }) {
  const width = scoreNumber(value);

  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#241B13]">
      <div
        className="h-full rounded-full bg-[#C7A45D]"
        style={{ width: `${Math.max(4, Math.min(100, width))}%` }}
      />
    </div>
  );
}

export default async function WantListPage() {
  const items = (await getWantList()) as WantItem[];

  const activeItems = items.filter((item) => !item.purchased);

  const estimatedExposure = activeItems.reduce(
    (sum, item) => sum + Number(item.marketplace_lowest_price ?? 0),
    0,
  );

  const highPriority = activeItems.filter((item) => item.priority === "High").length;

  const highPressure = activeItems.filter(
    (item) => scoreNumber(item.acquisition_pressure) >= 75,
  ).length;

  const synced = activeItems.filter((item) => item.sync_status === "synced").length;

  const avgRarity =
    activeItems.length > 0
      ? Math.round(
          activeItems.reduce((sum, item) => sum + scoreNumber(item.rarity_score), 0) /
            activeItems.length,
        )
      : 0;

  const userIdForAlerts = activeItems[0]?.user_id ?? null;

  return (
    <main className="min-h-screen bg-[#050403] text-[#F4EFE6]">
      <CINavigation />

      <section className="mx-auto max-w-7xl px-6 py-8">
        <section className="relative overflow-hidden rounded-[42px] border border-[#3A2B1C] bg-gradient-to-br from-[#17110B] via-[#0B0906] to-[#050403] p-8 shadow-[0_22px_90px_rgba(0,0,0,.62)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(199,164,93,.16),transparent_35%)]" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-[#8B5E24]/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.42em] text-[#D0B06C]">
                Collector Intelligence OS
              </p>

              <h1 className="mt-4 text-5xl font-black tracking-tight lg:text-6xl">
                Want Intelligence Command Center
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-7 text-[#B8AA96]">
                Acquisition intelligence for the records you are hunting:
                rarity, demand, pressure, sync health, marketplace exposure,
                and collector-grade decision signals.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full border border-[#C7A45D]/30 bg-[#C7A45D]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#E8C875]">
                  Live Want Engine
                </span>
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                  {synced}/{activeItems.length} Synced
                </span>
                <span className="rounded-full border border-red-500/25 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-100">
                  {highPressure} Pressure Targets
                </span>
              </div>
            </div>

            <div className="rounded-[32px] border border-[#352819] bg-[#0D0A07]/90 p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#8F806C]">
                Acquisition Posture
              </p>
              <p className="mt-3 text-4xl font-black text-[#D8B65A]">
                {highPressure > 0 ? "Active Watch" : "Stable Monitor"}
              </p>
              <p className="mt-3 text-sm leading-6 text-[#A99A84]">
                The system is now evaluating supply, demand, price pressure,
                and sync confidence instead of relying on simple listing counts.
              </p>
            </div>
          </div>
        </section>

        <WantAlertFeed userId={userIdForAlerts} />

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Metric label="Targets" value={String(activeItems.length)} sub="Open acquisition records" />
          <Metric label="High Priority" value={String(highPriority)} sub="Manually elevated targets" />
          <Metric label="High Pressure" value={String(highPressure)} sub="Pressure score 75+" accent />
          <Metric label="Avg Rarity" value={activeItems.length ? String(avgRarity) : "—"} sub="CI rarity score" />
          <Metric label="Exposure" value={money(estimatedExposure)} sub="Visible market ask" accent />
        </section>

        <section className="mt-8 rounded-[36px] border border-[#32281D] bg-[#0F0C09] p-6 shadow-2xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D0B06C]">
                Acquisition Input
              </p>
              <h2 className="mt-2 text-3xl font-black">Add Want Target</h2>
              <p className="mt-2 text-sm text-[#9C8D78]">
                Add a Discogs release ID and the intelligence engine will enrich
                marketplace supply, demand, rarity, and acquisition pressure.
              </p>
            </div>

            <div className="rounded-3xl border border-[#2E2418] bg-[#090705] p-4 text-xs leading-6 text-[#9C8D78]">
              Tip: add the specific release ID, not the master ID, so the system
              can evaluate the exact pressing or variant.
            </div>
          </div>

          <form
            action={addDiscogsReleaseToWantList}
            className="mt-6 grid gap-3 lg:grid-cols-[1fr_180px_1fr_auto]"
          >
            <input
              name="discogs_release_id"
              required
              placeholder="Discogs release ID"
              className="rounded-3xl border border-[#3A3025] bg-[#090705] px-5 py-4 text-sm outline-none transition focus:border-[#C7A45D]"
            />

            <select
              name="priority"
              defaultValue="Medium"
              className="rounded-3xl border border-[#3A3025] bg-[#090705] px-5 py-4 text-sm outline-none transition focus:border-[#C7A45D]"
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>

            <input
              name="notes"
              placeholder="Acquisition notes"
              className="rounded-3xl border border-[#3A3025] bg-[#090705] px-5 py-4 text-sm outline-none transition focus:border-[#C7A45D]"
            />

            <button
              type="submit"
              className="rounded-3xl bg-[#C7A45D] px-6 py-4 text-sm font-black text-black transition hover:bg-[#E0BF73]"
            >
              Add Target
            </button>
          </form>
        </section>

        {activeItems.length === 0 ? (
          <section className="mt-10 rounded-[36px] border border-dashed border-[#3A3025] bg-[#0D0A07] p-10 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D0B06C]">
              No Active Want Targets
            </p>
            <h2 className="mt-3 text-3xl font-black">Build your acquisition radar.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#9C8D78]">
              Add a Discogs release ID above to begin tracking market supply,
              rarity, demand, and acquisition pressure.
            </p>
          </section>
        ) : (
          <section className="mt-10 grid gap-5">
            {activeItems.map((item) => {
              const community = parseCommunity(item.notes);
              const internalRecordHref = item.record_id ? `/collection/${item.record_id}` : null;
              const discogsHref =
                item.discogs_url ?? `https://www.discogs.com/release/${item.discogs_release_id}`;

              return (
                <article
                  id={`want-${item.id}`}
                  key={item.id}
                  className="scroll-mt-28 overflow-hidden rounded-[38px] border border-[#2D241B] bg-gradient-to-br from-[#120F0C] via-[#0D0A07] to-[#070504] shadow-[0_18px_70px_rgba(0,0,0,.45)]"
                >
                  <div className="grid gap-6 p-6 lg:grid-cols-[160px_1fr_280px]">
                    <div>
                      {item.cover_url ? (
                        <img
                          src={item.cover_url}
                          alt={item.title ?? "Artwork"}
                          className="aspect-square w-full rounded-[28px] border border-[#312518] object-cover shadow-2xl"
                        />
                      ) : (
                        <div className="flex aspect-square w-full items-center justify-center rounded-[28px] border border-dashed border-[#3A3025] bg-[#0B0907] text-xs text-[#7F7364]">
                          No Artwork
                        </div>
                      )}

                      <div className={`mt-3 rounded-2xl border px-3 py-2 text-center text-xs font-black ${syncClass(item.sync_status)}`}>
                        {item.sync_status ? item.sync_status.toUpperCase() : "NOT SYNCED"}
                      </div>
                    </div>

                    <div>
                      <div className="flex flex-wrap gap-2">
                        <div className={`rounded-full border px-3 py-1 text-xs font-bold ${priorityClass(item.priority)}`}>
                          {item.priority ?? "Medium"} Priority
                        </div>

                        <div className={`rounded-full border px-3 py-1 text-xs font-bold ${signalClass(item.market_signal)}`}>
                          {item.market_signal ?? "Market Monitored"}
                        </div>

                        <div className="rounded-full border border-[#3A3025] bg-[#0D0A08] px-3 py-1 text-xs font-bold text-[#D8B65A]">
                          {rarityLabel(item.rarity_score)}
                        </div>

                        <div className="rounded-full border border-[#3A3025] bg-[#0D0A08] px-3 py-1 text-xs font-bold text-[#D8B65A]">
                          {demandLabel(item.demand_score)}
                        </div>
                      </div>

                      <h2 className="mt-4 text-3xl font-black tracking-tight">
                        {item.title || "Untitled Release"}
                      </h2>

                      <p className="mt-2 text-lg font-semibold text-[#D8C39B]">
                        {item.artist || "Unknown Artist"}
                      </p>

                      <p className="mt-4 max-w-3xl text-sm leading-7 text-[#A99A84]">
                        {intelligenceNarrative(item)}
                      </p>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Info label="Label" value={item.label} />
                        <Info label="Format" value={item.format} />
                        <Info label="Year" value={item.year_released} />
                        <Info label="Last Sync" value={compactDate(item.last_sync_at ?? item.updated_at)} />
                      </div>

                      <div className="mt-6 rounded-[30px] border border-[#2E2418] bg-[#0B0907] p-5">
                        <div className="grid gap-4 md:grid-cols-3">
                          <MiniMetric label="Lowest Ask" value={money(item.marketplace_lowest_price)} />
                          <MiniMetric label="For Sale" value={String(item.marketplace_for_sale_count ?? 0)} />
                          <MiniMetric
                            label="Community"
                            value={community ? `${community.want} want / ${community.have} have` : "—"}
                          />
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-3">
                          <div className="rounded-2xl border border-[#2E2418] bg-[#090705] p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7F7364]">
                              Rarity
                            </p>
                            <p className="mt-2 text-2xl font-black text-[#F4EFE6]">
                              {score(item.rarity_score)}
                            </p>
                            <ScoreBar value={item.rarity_score} />
                          </div>

                          <div className="rounded-2xl border border-[#2E2418] bg-[#090705] p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7F7364]">
                              Demand
                            </p>
                            <p className="mt-2 text-2xl font-black text-[#F4EFE6]">
                              {score(item.demand_score)}
                            </p>
                            <ScoreBar value={item.demand_score} />
                          </div>

                          <div className="rounded-2xl border border-[#2E2418] bg-[#090705] p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7F7364]">
                              Pressure
                            </p>
                            <p className="mt-2 text-2xl font-black text-[#D8B65A]">
                              {score(item.acquisition_pressure)}
                            </p>
                            <ScoreBar value={item.acquisition_pressure} />
                            <p className="mt-2 text-xs text-[#9C8D78]">
                              {pressureLabel(item.acquisition_pressure)}
                            </p>
                          </div>
                        </div>

                        {item.sync_error ? (
                          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-6 text-amber-100">
                            Sync note: {item.sync_error}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      {internalRecordHref ? (
                        <Link
                          href={internalRecordHref}
                          className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-center text-sm font-black text-cyan-100 transition hover:bg-cyan-500/15"
                        >
                          View CI Record
                        </Link>
                      ) : (
                        <a
                          href={discogsHref}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl border border-[#3A3025] bg-[#100D09] px-4 py-3 text-center text-sm font-black text-[#D8B65A] transition hover:bg-[#18120C]"
                        >
                          External Intelligence
                        </a>
                      )}

                      <a
                        href={discogsHref}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border border-[#4A3A1E] bg-[#15110C] px-4 py-3 text-center text-sm font-black text-[#D8B65A] transition hover:bg-[#1C160E]"
                      >
                        Discogs Release
                      </a>

                      {item.marketplace_url ? (
                        <a
                          href={item.marketplace_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl border border-[#3A2C18] bg-[#100D09] px-4 py-3 text-center text-sm font-black text-[#D7C49A] transition hover:bg-[#18120C]"
                        >
                          Marketplace
                        </a>
                      ) : null}

                      <form action={refreshWantListItem}>
                        <input type="hidden" name="id" value={item.id} />
                        <input
                          type="hidden"
                          name="discogs_release_id"
                          value={item.discogs_release_id}
                        />
                        <button
                          type="submit"
                          className="w-full rounded-2xl border border-[#4A3A1E] bg-[#14100B] px-4 py-3 text-sm font-black text-[#D8B65A] transition hover:bg-[#1C160E]"
                        >
                          Refresh Intelligence
                        </button>
                      </form>

                      <form action={markWantListItemPurchased}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          className="w-full rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-200 transition hover:bg-emerald-500/15"
                        >
                          Mark Purchased
                        </button>
                      </form>

                      <form action={deleteWantListItem}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 transition hover:bg-red-500/15"
                        >
                          Delete Target
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </section>
    </main>
  );
}
