import { createClient } from "@/src/lib/supabase/server";
import CINavigation from "@/app/components/CINavigation";

export default async function MarketLeadersPage() {
  const supabase = await createClient();

  const { data: hottest } = await supabase
    .from("records_clean_safe")
    .select(`
      id,
      artist,
      title,
      collector_iq_score,
      market_momentum,
      supply_pressure,
      demand_score,
      rarity_index,
      volatility_score
    `)
    .order("collector_iq_score", {
      ascending: false,
    })
    .limit(10);

  const { data: volatile } = await supabase
    .from("records_clean_safe")
    .select(`
      id,
      artist,
      title,
      volatility_score,
      market_momentum
    `)
    .order("volatility_score", {
      ascending: false,
    })
    .limit(10);

  const { data: rarest } = await supabase
    .from("records_clean_safe")
    .select(`
      id,
      artist,
      title,
      rarity_index,
      supply_pressure
    `)
    .order("rarity_index", {
      ascending: false,
    })
    .limit(10);

  const { data: velocity } = await supabase
    .from("records_clean_safe")
    .select(`
      id,
      artist,
      title,
      collector_velocity,
      market_momentum
    `)
    .order("collector_velocity", {
      ascending: false,
    })
    .limit(10);

  return (
    <main className="min-h-screen bg-[#020617] p-8 text-white">

      <CINavigation />

      <div className="mx-auto max-w-7xl">

        <div className="mb-10">

          <div
            className="
              text-xs
              uppercase
              tracking-[0.3em]
              text-cyan-300
            "
          >
            Collector Intelligence
          </div>

          <h1
            className="
              mt-3
              text-5xl
              font-black
            "
          >
            Market Leaders
          </h1>

          <div
            className="
              mt-4
              max-w-3xl
              text-slate-400
            "
          >
            Real-time collector market intelligence,
            rarity detection, volatility analysis,
            and momentum tracking across the
            global collection ecosystem.
          </div>

        </div>

        <div className="grid gap-8 lg:grid-cols-2">

          <LeaderboardCard
            title="🧠 Collector IQ Leaders"
            color="cyan"
            rows={hottest || []}
            metric="collector_iq_score"
          />

          <LeaderboardCard
            title="⚡ Volatility Watch"
            color="yellow"
            rows={volatile || []}
            metric="volatility_score"
          />

          <LeaderboardCard
            title="💎 Rarity Intelligence"
            color="pink"
            rows={rarest || []}
            metric="rarity_index"
          />

          <LeaderboardCard
            title="🚀 Collector Velocity"
            color="emerald"
            rows={velocity || []}
            metric="collector_velocity"
          />

        </div>

      </div>

    </main>
  );
}

function LeaderboardCard({
  title,
  rows,
  metric,
  color,
}: {
  title: string;
  rows: any[];
  metric: string;
  color: string;
}) {

  const colorClasses: Record<string, string> = {
    cyan:
      "border-cyan-400/20 bg-cyan-400/[0.04] text-cyan-300",

    yellow:
      "border-yellow-400/20 bg-yellow-400/[0.04] text-yellow-300",

    pink:
      "border-pink-400/20 bg-pink-400/[0.04] text-pink-300",

    emerald:
      "border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-300",
  };

  return (
    <div
      className={`
        rounded-[2rem]
        border
        p-6
        backdrop-blur-xl
        shadow-[0_0_40px_rgba(0,0,0,0.35)]
        ${colorClasses[color]}
      `}
    >

      <div
        className="
          mb-6
          text-2xl
          font-black
        "
      >
        {title}
      </div>

      <div className="space-y-4">

        {rows.map((row, index) => (

          <div
            key={row.id}
            className="
              rounded-2xl
              border
              border-white/10
              bg-black/30
              p-4
            "
          >

            <div
              className="
                flex
                items-start
                justify-between
                gap-4
              "
            >

              <div>

                <div
                  className="
                    text-xs
                    uppercase
                    tracking-[0.2em]
                    text-slate-500
                  "
                >
                  #{index + 1}
                </div>

                <div
                  className="
                    mt-1
                    text-lg
                    font-bold
                    text-white
                  "
                >
                  {row.artist}
                </div>

                <div
                  className="
                    text-sm
                    text-slate-400
                  "
                >
                  {row.title}
                </div>

              </div>

              <div className="text-right">

                <div
                  className="
                    text-3xl
                    font-black
                  "
                >
                  {row[metric]}
                </div>

                <div
                  className="
                    mt-1
                    text-xs
                    uppercase
                    tracking-[0.2em]
                    text-slate-500
                  "
                >
                  {metric.replaceAll("_", " ")}
                </div>

              </div>

            </div>

            {row.market_momentum && (

              <div
                className="
                  mt-4
                  inline-flex
                  rounded-full
                  border
                  border-white/10
                  bg-white/5
                  px-3
                  py-1
                  text-xs
                  uppercase
                  tracking-[0.15em]
                  text-slate-300
                "
              >
                {row.market_momentum}
              </div>

            )}

          </div>

        ))}

      </div>

    </div>
  );
}