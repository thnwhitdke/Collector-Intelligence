'use client'

import Link from 'next/link'

const navItems = [
  {
    href: '/collection',
    label: 'Collection',
  },
  {
    href: '/collection/value-dashboard',
    label: 'Portfolio',
  },
  {
    href: '/collection/market-intelligence',
    label: 'Market',
  },
  {
    href: '/collection/market-leaders',
    label: 'Leaders',
  },
  {
    href: '/collection/value-queue',
    label: 'Queue',
  },
  {
    href: '/collection/want-list',
    label: 'Want List',
  },
]

export default function CINavigation() {
  return (
    <div className="sticky top-0 z-50 mb-6 rounded-[28px] border border-cyan-500/10 bg-[#040404]/90 p-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">

        <div className="mr-3 rounded-2xl border border-cyan-500/10 bg-cyan-500/5 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
          Collector Intelligence OS
        </div>

        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-cyan-500/20 hover:text-cyan-200"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  )
}