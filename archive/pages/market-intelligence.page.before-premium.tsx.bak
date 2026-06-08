import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";
import LiveMarketFeed from "@/app/components/LiveMarketFeed";
import CINavigation from "@/app/components/CINavigation";

type SearchParams = {
  q?: string;
  signal?: string;
  sort?: string;
};

type MarketRecord = {
  id: string;
  artist: string | null;
  title: string | null;
  label: string | null;
  year_released: string | number | null;
  format: string | null;
  cover_url: string | null;
  estimated_value: number | string | null;
  discogs_low_price: number | string | null;
  discogs_median_price: number | string | null;
  discogs_high_price: number | string | null;
  discogs_for_sale: number | null;
  discogs_last_sold_date: string | null;
  value_source: string | null;
  value_last_updated: string | null;
  discogs_url: string | null;
};

function toNumber(value:any){
  if(typeof value==="string"){
    const n=Number(value.replace(/[$,]/g,"").trim());
    return Number.isFinite(n)?n:null;
  }
  return typeof value==="number"&&Number.isFinite(value)?value:null;
}

function money(v:any){
  const n=toNumber(v);
  if(n===null) return "—";
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
}

function formatDate(v:string|null){
  if(!v) return "Not available";
  return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(new Date(v));
}

function daysSince(v:string|null){
  if(!v) return null;
  const t=new Date(v).getTime();
  if(Number.isNaN(t)) return null;
  return Math.floor((Date.now()-t)/86400000);
}

function valueSpread(record:MarketRecord){
  const low=toNumber(record.discogs_low_price);
  const high=toNumber(record.discogs_high_price);
  if(low===null||high===null||low<=0||high<=0) return null;
  return high-low;
}

function marketSignal(record:MarketRecord){
  const forSale=record.discogs_for_sale;
  const lastSoldDays=daysSince(record.discogs_last_sold_date||record.value_last_updated);
  const spread=valueSpread(record);
  const estimated=toNumber(record.estimated_value);

  if(forSale!==null&&forSale<=2&&estimated!==null&&estimated>=40){
    return {label:"Hot Thin Market",className:"border-orange-400/30 bg-orange-400/10 text-orange-100",action:"Watch closely",description:"Scarcity + value detected."};
  }
  if(forSale!==null&&forSale<=2){
    return {label:"Thin Market",className:"border-amber-400/30 bg-amber-400/10 text-amber-100",action:"Monitor scarcity",description:"Very limited supply."};
  }
  if(spread!==null&&spread>=50){
    return {label:"Volatile Market",className:"border-red-400/30 bg-red-400/10 text-red-100",action:"Review comps",description:"Wide value spread."};
  }
  if(forSale!==null&&forSale>=25){
    return {label:"Saturated Market",className:"border-slate-400/30 bg-slate-400/10 text-slate-100",action:"Price carefully",description:"High supply."};
  }
  if(lastSoldDays!==null&&lastSoldDays<=180){
    return {label:"Active Market",className:"border-emerald-400/30 bg-emerald-400/10 text-emerald-100",action:"Monitor",description:"Recent activity."};
  }
  return {label:"Monitor",className:"border-cyan-400/30 bg-cyan-400/10 text-cyan-100",action:"Monitor",description:"No dominant signal."};
}

function normalizeSearch(v:string|undefined){
  return (v??"").trim().toLowerCase();
}

function matchesSearch(record:MarketRecord,q:string){
  if(!q) return true;
  const hay=[record.artist,record.title,record.label,record.format,record.year_released?String(record.year_released):null].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(q);
}

function sortRecords(records:MarketRecord[],sort:string){
  const s=[...records];
  if(sort==="supply_low") return s.sort((a,b)=>(a.discogs_for_sale??999999)-(b.discogs_for_sale??999999));
  if(sort==="spread_high") return s.sort((a,b)=>(valueSpread(b)??0)-(valueSpread(a)??0));
  return s.sort((a,b)=>(toNumber(b.estimated_value)??0)-(toNumber(a.estimated_value)??0));
}

export default async function MarketIntelligencePage({searchParams}:{searchParams?:Promise<SearchParams>}){
  const params=searchParams?await searchParams:{};
  const q=normalizeSearch(params.q);
  const selectedSignal=params.signal??"all";
  const selectedSort=params.sort??"value_high";

  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const userId=user?.id??"";

  let query=supabase.from("records_clean_safe").select(`
    id,artist,title,label,year_released,format,cover_url,
    estimated_value,discogs_low_price,discogs_median_price,
    discogs_high_price,discogs_for_sale,discogs_last_sold_date,
    value_source,value_last_updated,discogs_url
  `).limit(2000);

  if(userId) query=query.eq("user_id",userId);

  const {data,error}=await query;
  const raw=(data??[]) as MarketRecord[];
  const searched=raw.filter(r=>matchesSearch(r,q));
  const filtered=selectedSignal==="all"?searched:searched.filter(r=>marketSignal(r).label.toLowerCase().includes(selectedSignal.replace("_"," ")));
  const records=sortRecords(filtered,selectedSort);

  const total=records.reduce((s,r)=>s+(toNumber(r.estimated_value)??0),0);
  const thin=raw.filter(r=>marketSignal(r).label.includes("Thin")).length;
  const active=raw.filter(r=>marketSignal(r).label==="Active Market").length;
  const volatile=raw.filter(r=>marketSignal(r).label==="Volatile Market").length;

  return (
    <main className="min-h-screen bg-[#071019] px-6 py-8 text-white">
      <CINavigation />
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[2rem] border border-cyan-500/10 bg-gradient-to-br from-[#071b2b] to-[#0d1420] p-8 shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:justify-between lg:items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">Collector Intelligence OS</div>
              <h1 className="mt-3 text-5xl font-black">Market Intelligence Command Center</h1>
              <p className="mt-4 max-w-3xl text-slate-300">Live signals, scarcity detection, volatility intelligence and collector decision support.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/collection" className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3">Collection</Link>
              <Link href="/collection/value-dashboard" className="rounded-2xl bg-cyan-300 px-5 py-3 text-slate-950 font-bold">Portfolio</Link>
            </div>
          </div>
        </section>

        <LiveMarketFeed />

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[2rem] border border-cyan-500/10 bg-cyan-500/[0.04] p-6"><div className="text-xs uppercase tracking-[0.25em] text-cyan-300">Portfolio Value</div><div className="mt-3 text-3xl font-black">{money(total)}</div></div>
          <div className="rounded-[2rem] border border-orange-500/10 bg-orange-500/[0.04] p-6"><div className="text-xs uppercase tracking-[0.25em] text-orange-300">Thin Markets</div><div className="mt-3 text-3xl font-black">{thin}</div></div>
          <div className="rounded-[2rem] border border-emerald-500/10 bg-emerald-500/[0.04] p-6"><div className="text-xs uppercase tracking-[0.25em] text-emerald-300">Active</div><div className="mt-3 text-3xl font-black">{active}</div></div>
          <div className="rounded-[2rem] border border-red-500/10 bg-red-500/[0.04] p-6"><div className="text-xs uppercase tracking-[0.25em] text-red-300">Volatile</div><div className="mt-3 text-3xl font-black">{volatile}</div></div>
        </section>

        <form action="/collection/market-intelligence" className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr_1fr_auto]">
            <input name="q" defaultValue={params.q??""} placeholder="Search artist, title, label..." className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3"/>
            <select name="signal" defaultValue={selectedSignal} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <option value="all">All Signals</option>
              <option value="thin">Thin</option>
              <option value="volatile">Volatile</option>
            </select>
            <select name="sort" defaultValue={selectedSort} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <option value="value_high">Highest Value</option>
              <option value="spread_high">Highest Spread</option>
              <option value="supply_low">Lowest Supply</option>
            </select>
            <button className="rounded-2xl bg-cyan-300 px-5 py-3 font-black text-slate-950">Apply</button>
          </div>
        </form>

        <section className="space-y-5">
          {error ? <div className="rounded-2xl border border-red-500/20 bg-red-950/40 p-6">{error.message}</div> : null}
          {records.map((record)=>{
            const signal=marketSignal(record);
            return (
              <article key={record.id} className="rounded-[2rem] border border-white/10 bg-white/[0.03] overflow-hidden">
                <div className="grid md:grid-cols-[140px_1fr]">
                  <div className="p-4 bg-black/20">
                    <div className="aspect-square overflow-hidden rounded-2xl border border-white/10">
                      {record.cover_url ? <img src={record.cover_url} alt={record.title??""} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-xs text-slate-500">NO COVER</div>}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                      <div>
                        <h2 className="text-2xl font-black">{record.title??"Untitled"}</h2>
                        <div className="mt-1 text-cyan-200">{record.artist??"Unknown Artist"}</div>
                        <div className="mt-2 text-sm text-slate-400">{[record.label,record.year_released,record.format].filter(Boolean).join(" • ")}</div>
                      </div>
                      <div className={`rounded-2xl border px-4 py-3 text-sm ${signal.className}`}>
                        <div className="font-bold">{signal.label}</div>
                        <div className="mt-1 opacity-80">{signal.description}</div>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-5">
                      <Metric label="Estimated" value={money(record.estimated_value)} />
                      <Metric label="Median" value={money(record.discogs_median_price)} />
                      <Metric label="Spread" value={money(valueSpread(record))} />
                      <Metric label="For Sale" value={String(record.discogs_for_sale??"—")} />
                      <Metric label="Updated" value={formatDate(record.value_last_updated)} />
                    </div>
                    <div className="mt-5 flex gap-2">
                      <Link href={`/collection/${record.id}`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm">Open Record</Link>
                      {record.discogs_url ? <a href={record.discogs_url} target="_blank" className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">Discogs</a> : null}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      </div>
    </main>
  )
}

function Metric({label,value}:{label:string;value:string}){
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 font-bold">{value}</div>
    </div>
  )
}
