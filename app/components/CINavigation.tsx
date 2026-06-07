'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    href: '/collection',
    label: 'Collection',
  },
  {
    href: '/collection/operations-center',
    label: 'Operations',
  },
  {
    href: '/collection/value-dashboard',
    label: 'Portfolio',
  },
  {
    href: '/collection/valuation-explorer',
    label: 'Valuation',
  },
  {
    href: '/collection/market-intelligence',
    label: 'Market',
  },
  {
    href: '/collection/acquisition-radar',
    label: 'Radar',
  },
  {
    href: '/collection/market-leaders',
    label: 'Leaders',
  },
  {
    href: '/dashboard/enrichment-operations',
    label: 'Enrichment Ops',
  },
  {
    href: '/collection/want-list',
    label: 'Want List',
  },
  {
    href: '/collection/runout-identifier',
    label: 'Pressing AI',
  },
  {
    href: '/collection/track-intelligence',
    label: 'Tracks',
  },
  {
    href: '/collection/ebay-sold-comp-helper',
    label: 'Comp Lab',
  },
]

export default function CINavigation() {
  const pathname = usePathname()

  return (
    <div className="sticky top-0 z-50 mb-6 rounded-[30px] border border-cyan-500/10 bg-[#040404]/90 p-3 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,255,255,0.03)]">
      <div className="flex flex-wrap items-center gap-3">

        <div className="mr-3 rounded-2xl border border-cyan-500/10 bg-cyan-500/5 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
          Collector Intelligence OS
        </div>

        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-4 py-2 text-sm font-medium transition-all duration-300
              ${
                active
                  ? 'border border-cyan-400/20 bg-cyan-500/10 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.12)]'
                  : 'border border-white/5 bg-white/[0.03] text-zinc-300 hover:border-cyan-500/20 hover:bg-cyan-500/[0.04] hover:text-cyan-200'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
        <form action="/auth/signout" method="post" className="ml-auto">
          <button className="rounded-2xl border border-red-500/15 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/20">
            Logout
          </button>
        </form>
      </div>
    </div>
  )
}
