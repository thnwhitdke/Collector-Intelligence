import { createAdminClient } from "@/src/lib/supabase/admin"

export const dynamic = "force-dynamic";

function num(value: number | string | null | undefined) {
  const n = Number(value || 0);
  return n.toLocaleString();
}

function money(value: number | string | null | undefined) {
  const n = Number(value || 0);
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function score(value: number | string | null | undefined) {
  const n = Number(value || 0);
  return Math.round(n).toLocaleString();
}

function pct(value: number, total: number) {
  if (!total) return "0%";
  return `${((value / total) * 100).toFixed(2)}%`;
}

function Card({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 shadow-sm">
      <div className="text-sm font-semibold text-stone-400">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-tight text-white">{value}</div>
      {helper ? <div className="mt-2 text-sm text-stone-500">{helper}</div> : null}
    </div>
  );
}

function IntelligenceList({
  title,
  helper,
  records,
  type,
}: {
  title: string;
  helper: string;
  records: any[];
  type: "demand" | "scarcity" | "momentum" | "opportunity";
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5">
      <div className="mb-4">
        <h2 className="text-xl font-black text-white">{title}</h2>
        <p className="mt-1 text-sm text-stone-500">{helper}</p>
      </div>

      <div className="space-y-3">
        {records.length ? records.map((r: any, index: number) => {
          const artist = r.artist || r.master_artist || "Unknown Artist";
          const title = r.title || r.master_title || "Untitled";
          const label = r.label || r.record_label || "Unknown label";
          const country = r.country || "Unknown country";
          const value = Number(r.estimated_value || r.current_value || r.market_median || r.median_price || 0);
          const demand = Number(r.demand_score || 0);
          const scarcity = Number(r.rarity_score || r.scarcity_score || 0);
          const momentum = Number(r.momentum_score || 0);
          const auctionCount = Number(r.auction_count || 0);

          let main = "";
          let mainLabel = "";
          let badge = "";

          if (type === "demand") {
            main = score(demand);
            mainLabel = "Demand";
            badge = demand >= 80 ? "High Demand" : demand >= 50 ? "Active Demand" : "Tracked";
          } else if (type === "scarcity") {
            main = score(scarcity);
            mainLabel = "Scarcity";
            badge = scarcity >= 80 ? "Rare" : scarcity >= 50 ? "Scarce" : "Tracked";
          } else if (type === "momentum") {
            main = score(momentum);
            mainLabel = "Momentum";
            badge = momentum >= 70 ? "Heating Up" : momentum >= 40 ? "Moving" : "Stable";
          } else {
            const opportunity = Math.round((demand * 0.35) + (scarcity * 0.35) + (momentum * 0.3));
            main = score(opportunity);
            mainLabel = "Opportunity";
            badge = opportunity >= 80 ? "Priority" : opportunity >= 60 ? "Watch" : "Monitor";
          }

          return (
            <div key={`${artist}-${title}-${index}`} className="rounded-xl bg-white/[0.055] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-white">{artist}</div>
                  <div className="text-sm font-semibold text-stone-300">{title}</div>
                  <div className="mt-1 text-xs text-stone-500">{label} · {country}</div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black text-white">{main}</div>
                  <div className="text-xs font-semibold text-stone-500">{mainLabel}</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-stone-300">{badge}</span>
                {value > 0 ? <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-stone-300">{money(value)} value</span> : null}
                {auctionCount > 0 ? <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-stone-300">Popsike {auctionCount} sales</span> : null}
              </div>
            </div>
          );
        }) : (
          <div className="rounded-xl bg-white/[0.055] p-4 text-sm text-stone-500">
            No records available yet. Intelligence will appear as enrichment jobs complete.
          </div>
        )}
      </div>
    </section>
  );
}

export default async function CollectionIntelligencePage() {
  const supabase = createAdminClient();

  const [
    portfolioRes,
    warehouseRes,
    leaderboardRes,
    auctionRes,
  ] = await Promise.all([
    supabase
      .from("portfolio_intelligence_v2")
      .select("*")
      .order("total_records", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("release_warehouse_metrics").select("*").limit(1).maybeSingle(),
    supabase
      .from("intelligence_leaderboard_v2")
      .select("*")
      .order("estimated_value", { ascending: false })
      .limit(500),
    supabase.from("external_market_comp_summary_safe").select("record_id, auction_count, median_price, high_price").eq("source", "popsike").limit(2500),
  ]);

  const portfolio: any = portfolioRes.data || {};
  const warehouse: any = warehouseRes.data || {};
  const rows: any[] = leaderboardRes.data || [];
  const auctions: any[] = auctionRes.data || [];

  const auctionByRecord = new Map(auctions.map((a: any) => [String(a.record_id), a]));

  const enriched = rows.map((r: any) => {
    const a = auctionByRecord.get(String(r.id || r.record_id)) || {};
    return {
      ...r,
      auction_count: a.auction_count || 0,
      median_price: a.median_price || null,
      high_price: a.high_price || null,
    };
  });

  const demandLeaders = [...enriched]
    .filter((r: any) => Number(r.demand_score || 0) > 0)
    .sort((a: any, b: any) => Number(b.demand_score || 0) - Number(a.demand_score || 0))
    .slice(0, 8);

  const scarcityLeaders = [...enriched]
    .filter((r: any) => Number(r.rarity_score || r.scarcity_score || 0) > 0)
    .sort((a: any, b: any) => Number(b.rarity_score || b.scarcity_score || 0) - Number(a.rarity_score || a.scarcity_score || 0))
    .slice(0, 8);

  const momentumLeaders = [...enriched]
    .filter((r: any) => Number(r.momentum_score || 0) > 0)
    .sort((a: any, b: any) => Number(b.momentum_score || 0) - Number(a.momentum_score || 0))
    .slice(0, 8);

  const opportunityLeaders = [...enriched]
    .map((r: any) => ({
      ...r,
      opportunity_score:
        Number(r.demand_score || 0) * 0.35 +
        Number(r.rarity_score || r.scarcity_score || 0) * 0.35 +
        Number(r.momentum_score || 0) * 0.3,
    }))
    .sort((a: any, b: any) => Number(b.opportunity_score || 0) - Number(a.opportunity_score || 0))
    .slice(0, 8);

  const ownedRecords = Number(portfolio.total_records || portfolio.owned_records || 0);
  const warehouseReleases = Number(warehouse.releases || 0);
  const warehouseVinyl = Number(warehouse.vinyl_releases || 0);

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white sm:px-8 lg:px-14">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight">Collection Intelligence Command Center</h1>
          <p className="mt-3 max-w-4xl text-stone-400">
            Your collection compared against the Collector Intelligence warehouse: demand, scarcity, momentum,
            coverage, Discogs matching, Popsike auction support, and market readiness.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <Card label="Portfolio Value" value={money(portfolio.portfolio_value || portfolio.total_collection_value)} helper="Current intelligence valuation" />
          <Card label="Avg Demand" value={score(portfolio.avg_demand_score)} helper="Demand signal across owned records" />
          <Card label="Avg Scarcity" value={score(portfolio.avg_rarity_score)} helper="Scarcity score across collection" />
          <Card label="Avg Momentum" value={score(portfolio.avg_momentum_score)} helper="Current market movement" />
        </section>

        <section className="mt-8 rounded-3xl border border-cyan-500/10 bg-cyan-950/10 p-6">
          <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-black">Collection vs Warehouse</h2>
              <p className="mt-2 text-sm text-stone-400">
                This shows how your personal archive compares to the release universe Collector Intelligence is building.
              </p>
            </div>
            <div className="text-sm text-stone-500">
              Warehouse refresh: {warehouse.refreshed_at ? new Date(warehouse.refreshed_at).toLocaleString() : "Unknown"}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card label="Owned Records" value={num(ownedRecords)} helper={`${pct(ownedRecords, warehouseReleases)} of warehouse releases`} />
            <Card label="Owned Artists" value={num(portfolio.owned_artists)} helper={`${pct(Number(portfolio.owned_artists || 0), Number(warehouse.artists || 0))} of known artists`} />
            <Card label="Owned Labels" value={num(portfolio.owned_labels)} helper={`${pct(Number(portfolio.owned_labels || 0), Number(warehouse.labels || 0))} of known labels`} />
            <Card label="Owned Countries" value={num(portfolio.owned_countries)} helper={`${pct(Number(portfolio.owned_countries || 0), Number(warehouse.countries || 0))} of known countries`} />
            <Card label="Warehouse Releases" value={num(warehouseReleases)} helper={`${num(warehouseVinyl)} vinyl references`} />
            <Card label="Collection Coverage" value={pct(ownedRecords, warehouseReleases)} helper={`${num(ownedRecords)} owned of ${num(warehouseReleases)} warehouse releases`} />
            <Card label="Warehouse Artists" value={num(warehouse.artists)} helper="Known artist universe" />
            <Card label="Warehouse Labels" value={num(warehouse.labels)} helper="Known label universe" />
            <Card label="Warehouse Countries" value={num(warehouse.countries)} helper="Known country coverage" />
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <IntelligenceList
            title="Highest Demand"
            helper="Records with the strongest demand signals. This should never show only “Matched.”"
            records={demandLeaders}
            type="demand"
          />

          <IntelligenceList
            title="Rarest Releases"
            helper="Records ranked by scarcity signal, not by price alone."
            records={scarcityLeaders}
            type="scarcity"
          />

          <IntelligenceList
            title="Highest Momentum"
            helper="Records with the strongest market movement signal."
            records={momentumLeaders}
            type="momentum"
          />

          <IntelligenceList
            title="Collector Opportunity"
            helper="Blended signal using demand, scarcity, momentum, and auction support."
            records={opportunityLeaders}
            type="opportunity"
          />
        </section>
      </div>
    </main>
  );
}
