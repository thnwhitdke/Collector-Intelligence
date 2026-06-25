type Dimension = {
  label: string
  value: number
  helper: string
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(Number(n || 0))))
}

export default function CollectionIntelligenceRadar({
  demand,
  rarity,
  momentum,
  depth,
  coverage,
  valueStrength,
}: {
  demand: number
  rarity: number
  momentum: number
  depth: number
  coverage: number
  valueStrength: number
}) {
  const dimensions: Dimension[] = [
    { label: "Demand", value: clamp(demand), helper: "Collector interest" },
    { label: "Rarity", value: clamp(rarity), helper: "Scarcity signal" },
    { label: "Momentum", value: clamp(momentum), helper: "Market movement" },
    { label: "Depth", value: clamp(depth), helper: "Collection strength" },
    { label: "Coverage", value: clamp(coverage), helper: "Warehouse match" },
    { label: "Value", value: clamp(valueStrength), helper: "Market consensus" },
  ]

  const size = 420
  const center = size / 2
  const radius = 155
  const points = dimensions.map((d, i) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / dimensions.length
    const r = radius * (d.value / 100)
    return [center + Math.cos(angle) * r, center + Math.sin(angle) * r]
  })

  const polygon = points.map(([x, y]) => `${x},${y}`).join(" ")
  const overall = clamp(dimensions.reduce((sum, d) => sum + d.value, 0) / dimensions.length)

  return (
    <section className="rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-[#071315] via-[#0A0A0A] to-black p-6">
      <div className="mb-6">
        <div className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
          Intelligence Radar
        </div>
        <h2 className="mt-3 text-3xl font-black text-white">Strategic Collection Shape</h2>
        <p className="mt-2 text-sm text-[#B8AA96]">
          A geometric view of your collection across demand, rarity, momentum, depth, coverage, and value strength.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[480px_1fr]">
        <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
          <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-[420px] w-full max-w-[460px]">
            {[0.25, 0.5, 0.75, 1].map((level) => {
              const ring = dimensions.map((_, i) => {
                const angle = -Math.PI / 2 + (Math.PI * 2 * i) / dimensions.length
                const r = radius * level
                return [center + Math.cos(angle) * r, center + Math.sin(angle) * r]
              })
              return (
                <polygon
                  key={level}
                  points={ring.map(([x, y]) => `${x},${y}`).join(" ")}
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1"
                />
              )
            })}

            {dimensions.map((d, i) => {
              const angle = -Math.PI / 2 + (Math.PI * 2 * i) / dimensions.length
              const x = center + Math.cos(angle) * radius
              const y = center + Math.sin(angle) * radius
              const lx = center + Math.cos(angle) * (radius + 34)
              const ly = center + Math.sin(angle) * (radius + 34)

              return (
                <g key={d.label}>
                  <line x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.10)" />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#F4EFE6"
                    fontSize="13"
                    fontWeight="800"
                  >
                    {d.label}
                  </text>
                </g>
              )
            })}

            <polygon points={polygon} fill="rgba(34,211,238,0.22)" stroke="rgba(34,211,238,0.95)" strokeWidth="3" />

            {points.map(([x, y], i) => (
              <circle key={dimensions[i].label} cx={x} cy={y} r="5" fill="#FACC15" stroke="#111" strokeWidth="2" />
            ))}

            <circle cx={center} cy={center} r="54" fill="rgba(0,0,0,0.75)" stroke="rgba(250,204,21,0.55)" />
            <text x={center} y={center - 6} textAnchor="middle" fill="white" fontSize="38" fontWeight="900">
              {overall}
            </text>
            <text x={center} y={center + 24} textAnchor="middle" fill="#FACC15" fontSize="13" fontWeight="800">
              IQ Score
            </text>
          </svg>
        </div>

        <div className="grid gap-3">
          {dimensions.map((d) => (
            <div key={d.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-black text-white">{d.label}</div>
                  <div className="text-sm text-[#8E8170]">{d.helper}</div>
                </div>
                <div className="text-2xl font-black text-cyan-200">{d.value}/100</div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-yellow-300"
                  style={{ width: `${d.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
