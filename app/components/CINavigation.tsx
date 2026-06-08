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
  const active = pathname === item.href || pathname.startsWith(item.href + '/')

  return (
    <Link
      href={item.href}
      className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-bold transition-all duration-200 ${
        active
          ? 'border border-cyan-400/25 bg-cyan-500/10 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.12)]'
          : 'border border-white/5 bg-white/[0.03] text-zinc-300 hover:border-cyan-500/20 hover:bg-cyan-500/[0.04] hover:text-cyan-200'
      }`}
    >
      {item.label}
    </Link>
  )
}

export default function CINavigation() {
  async function handleLogout() {
    await fetch('/auth/signout', {
      method: 'POST',
      cache: 'no-store',
    })

    window.location.href = '/'
  }

  return (
    <nav className="sticky top-0 z-50 mb-8 border-b border-cyan-500/10 bg-[#040404]/95 px-4 py-4 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,255,255,0.03)]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <Link
            href="/collection/daily-briefing"
            className="whitespace-nowrap rounded-2xl border border-cyan-500/15 bg-cyan-500/5 px-5 py-3 text-xs font-black uppercase tracking-[0.3em] text-cyan-300 transition hover:bg-cyan-500/10"
          >
            Collector Intelligence
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="whitespace-nowrap rounded-2xl border border-red-500/15 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-100 transition hover:bg-red-500/20"
          >
            Logout
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          {navGroups.map((group) => (
            <section
              key={group.label}
              className="rounded-[26px] border border-white/5 bg-white/[0.025] p-3"
            >
              <div className="mb-3 px-2 text-[10px] font-black uppercase tracking-[0.26em] text-zinc-600">
                {group.label}
              </div>

              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </nav>
  )
}
