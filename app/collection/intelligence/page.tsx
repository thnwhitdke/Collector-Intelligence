import CINavigation from "@/app/components/CINavigation"
import Link from "next/link"
import { createClient } from '@/src/lib/supabase/server'

export default async function IntelligencePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: portfolio } = await supabase
    .from('portfolio_intelligence_v2')
    .select('*')
    .eq('user_id', user?.id)
    .order('total_records', { ascending: false })
    .limit(1)
    .single()

  const { data: demand } = await supabase
    .from('intelligence_leaderboard_v2')
    .select('*')
    .eq('user_id', user?.id)
    .order('demand_score_v2', { ascending: false })
    .limit(10)

  const { data: rarity } = await supabase
    .from('intelligence_leaderboard_v2')
    .select('*')
    .eq('user_id', user?.id)
    .order('rarity_score_v2', { ascending: false })
    .limit(10)

  const { data: momentum } = await supabase
    .from('intelligence_leaderboard_v2')
    .select('*')
    .eq('user_id', user?.id)
    .order('momentum_score_v2', { ascending: false })
    .limit(10)

  const Table = ({ title, rows, scoreKey }: any) => (
    <section className="rounded-2xl border border-white/10 bg-[#111111] p-5">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      <div className="space-y-3">
        {(rows || []).map((r: any) => (
          <Link
            key={`${title}-${r.record_id}`}
            href={`/collection/${r.record_id}?returnTo=/collection/intelligence`}
            className="block rounded-xl bg-[#1A1A1A] p-4 transition hover:bg-[#242424]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">{r.artist}</div>
                <div className="text-sm text-[#B8AA96]">{r.title}</div>
                <div className="mt-1 text-xs text-[#8E8170]">{r.intelligence_reason_v2}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{r[scoreKey]}</div>
                <div className="text-xs text-[#B8AA96]">Score</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )

  return (
    <main className="min-h-screen bg-[#090909] text-[#F4EFE6]"><CINavigation /><div className="mx-auto max-w-7xl space-y-8 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold">Collector Intelligence</h1>
        <p className="mt-2 text-[#B8AA96]">
          Demand, scarcity, momentum, and valuation confidence across your collection.
        </p>
      </div>

      {portfolio && (
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
            <div className="text-sm text-[#B8AA96]">Portfolio Value</div>
            <div className="text-2xl font-bold">${Number(portfolio.portfolio_value || 0).toLocaleString()}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
            <div className="text-sm text-[#B8AA96]">Avg Demand</div>
            <div className="text-2xl font-bold">{portfolio.avg_demand_score}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
            <div className="text-sm text-[#B8AA96]">Avg Scarcity</div>
            <div className="text-2xl font-bold">{portfolio.avg_rarity_score}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
            <div className="text-sm text-[#B8AA96]">Avg Momentum</div>
            <div className="text-2xl font-bold">{portfolio.avg_momentum_score}</div>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Table title="Highest Demand" rows={demand} scoreKey="demand_score_v2" />
        <Table title="Rarest Releases" rows={rarity} scoreKey="rarity_score_v2" />
        <Table title="Highest Momentum" rows={momentum} scoreKey="momentum_score_v2" />
      </div>
    </div></main>
  )
}
