'use client'

import { useEffect, useState } from 'react'

export default function MobileInstallHint() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari support
      window.navigator.standalone === true

    const dismissed = localStorage.getItem('ci-install-hint-dismissed') === 'true'
    setShow(isIOS && !standalone && !dismissed)
  }, [])

  if (!show) return null

  return (
    <div className="fixed inset-x-3 bottom-3 z-[9999] rounded-2xl border border-white/15 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur md:hidden">
      <div className="text-sm font-semibold">Install Collector Intelligence</div>
      <div className="mt-1 text-xs leading-5 text-slate-300">
        On iPhone: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.
      </div>
      <button
        onClick={() => {
          localStorage.setItem('ci-install-hint-dismissed', 'true')
          setShow(false)
        }}
        className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-950"
      >
        Got it
      </button>
    </div>
  )
}
