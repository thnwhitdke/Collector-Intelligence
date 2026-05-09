interface Props {
  totalValue: number;
  totalRecords: number;
  avgROI: number;
  activeMarkets: number;
}

export default function KpiCards({
  totalValue,
  totalRecords,
  avgROI,
  activeMarkets,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

      <div className="rounded-3xl p-6 bg-gradient-to-br from-violet-600/20 to-zinc-900 border border-violet-500/20 shadow-2xl shadow-violet-500/10">

        <div className="text-zinc-400 text-sm uppercase tracking-wider">
          Collection Value
        </div>

        <div className="text-5xl font-black mt-3 text-violet-400">
          $
          {totalValue.toLocaleString()}
        </div>

        <div className="text-violet-300 text-sm mt-3">
          Estimated market portfolio
        </div>

      </div>

      <div className="rounded-3xl p-6 bg-gradient-to-br from-cyan-600/20 to-zinc-900 border border-cyan-500/20 shadow-2xl shadow-cyan-500/10">

        <div className="text-zinc-400 text-sm uppercase tracking-wider">
          Records Cataloged
        </div>

        <div className="text-5xl font-black mt-3 text-cyan-400">
          {totalRecords}
        </div>

        <div className="text-cyan-300 text-sm mt-3">
          Active indexed records
        </div>

      </div>

      <div className="rounded-3xl p-6 bg-gradient-to-br from-emerald-600/20 to-zinc-900 border border-emerald-500/20 shadow-2xl shadow-emerald-500/10">

        <div className="text-zinc-400 text-sm uppercase tracking-wider">
          Average ROI
        </div>

        <div className="text-5xl font-black mt-3 text-emerald-400">
          {avgROI}%
        </div>

        <div className="text-emerald-300 text-sm mt-3">
          Estimated appreciation
        </div>

      </div>

      <div className="rounded-3xl p-6 bg-gradient-to-br from-pink-600/20 to-zinc-900 border border-pink-500/20 shadow-2xl shadow-pink-500/10">

        <div className="text-zinc-400 text-sm uppercase tracking-wider">
          Active Markets
        </div>

        <div className="text-5xl font-black mt-3 text-pink-400">
          {activeMarkets}
        </div>

        <div className="text-pink-300 text-sm mt-3">
          Geographic market exposure
        </div>

      </div>

    </div>
  );
}