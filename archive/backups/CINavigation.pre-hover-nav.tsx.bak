'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = {
  href: string
  label: string
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Daily Use',
    items: [
      { href: '/collection/daily-briefing', label: 'Briefing' },
      { href: '/collection', label: 'Collection' },
      { href: '/collection/want-list', label: 'Want List' },
      { href: '/collection/acquisition-radar', label: 'Acquisition' },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      { href: '/collection/value-dashboard', label: 'Portfolio' },
      { href: '/collection/valuation-explorer', label: 'Valuation' },
      { href: '/collection/market-intelligence', label: 'Market' },
      { href: '/collection/market-leaders', label: 'Leaders' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/collection/integrity-center', label: 'Integrity' },
      { href: '/collection/track-intelligence', label: 'Tracks' },
      { href: '/collection/favorite-artists', label: 'Artists' },
      { href: '/collection/runout-identifier', label: 'Pressing' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/collection/ebay-sold-comp-helper', label: 'Comps' },
      { href: '/collection/operations-center', label: 'Operations' },
      { href: '/dashboard/enrichment-operations', label: 'Ops' },
    ],
  },
]

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname()

  const active =
    pathname === item.href ||
    pathname.startsWith(item.href + '/')

  return (
    <Link
      href={item.href}
      className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-medium transition-all duration-300
      ${
        active
          ? 'border border-cyan-400/20 bg-cyan-500/10 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.12)]'
          : 'border border-white/5 bg-white/[0.03] text-zinc-300 hover:border-cyan-500/20 hover:bg-cyan-500/[0.04] hover:text-cyan-200'
      }`}
    >
      {item.label}
    </Link>
  )
}

export default function CINavigation() {
  return (
    <nav className="sticky top-0 z-50 mb-6 rounded-[30px] border border-cyan-500/10 bg-[#040404]/90 p-3 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,255,255,0.03)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
        <Link
          href="/collection/daily-briefing"
          className="rounded-2xl border border-cyan-500/10 bg-cyan-500/5 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-cyan-300 transition hover:bg-cyan-500/10 xl:mr-2"
        >
          Collector Intelligence
        </Link>

        <div className="flex flex-1 flex-col gap-3">
          {navGroups.map((group) => (
            <div key={group.label} className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="w-28 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">
                {group.label}
              </div>

              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <form action="/auth/signout" method="post" className="xl:ml-3">
          <button className="w-full whitespace-nowrap rounded-2xl border border-red-500/15 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/20 xl:w-auto">
            Logout
          </button>
        </form>
      </div>
    </nav>
  )
}
