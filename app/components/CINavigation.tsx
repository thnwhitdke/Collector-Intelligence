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

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

export default function CINavigation() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 mb-6 border-b border-cyan-500/10 bg-[#040404]/95 px-4 py-3 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,255,255,0.03)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link
          href="/collection/daily-briefing"
          className="whitespace-nowrap rounded-2xl border border-cyan-500/15 bg-cyan-500/5 px-5 py-3 text-xs font-black uppercase tracking-[0.3em] text-cyan-300 transition hover:bg-cyan-500/10"
        >
          Collector Intelligence
        </Link>

        <div className="hidden flex-1 justify-center gap-3 lg:flex">
          {navGroups.map((group) => {
            const groupActive = group.items.some((item) => isActive(pathname, item.href))

            return (
              <div key={group.label} className="group relative">
                <button
                  type="button"
                  className={`rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.16em] transition-all duration-300 ${
                    groupActive
                      ? 'border border-cyan-400/25 bg-cyan-500/10 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.12)]'
                      : 'border border-white/5 bg-white/[0.03] text-zinc-300 hover:border-cyan-500/20 hover:bg-cyan-500/[0.04] hover:text-cyan-200'
                  }`}
                >
                  {group.label}
                </button>

                <div className="pointer-events-none absolute left-1/2 top-full mt-3 w-72 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                  <div className="rounded-[28px] border border-cyan-500/10 bg-[#050505]/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl">
                    <div className="mb-2 px-3 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-600">
                      {group.label}
                    </div>

                    <div className="grid gap-2">
                      {group.items.map((item) => {
                        const active = isActive(pathname, item.href)

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                              active
                                ? 'border border-cyan-400/20 bg-cyan-500/10 text-cyan-200'
                                : 'border border-white/5 bg-white/[0.03] text-zinc-300 hover:border-cyan-500/20 hover:bg-cyan-500/[0.04] hover:text-cyan-200'
                            }`}
                          >
                            {item.label}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-1 flex-wrap justify-center gap-2 lg:hidden">
          {navGroups.flatMap((group) =>
            group.items.map((item) => {
              const active = isActive(pathname, item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition-all duration-300 ${
                    active
                      ? 'border border-cyan-400/20 bg-cyan-500/10 text-cyan-200'
                      : 'border border-white/5 bg-white/[0.03] text-zinc-300 hover:border-cyan-500/20 hover:bg-cyan-500/[0.04] hover:text-cyan-200'
                  }`}
                >
                  {item.label}
                </Link>
              )
            }),
          )}
        </div>

        <form action="/auth/signout" method="post">
          <button className="whitespace-nowrap rounded-2xl border border-red-500/15 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-100 transition hover:bg-red-500/20">
            Logout
          </button>
        </form>
      </div>
    </nav>
  )
}
