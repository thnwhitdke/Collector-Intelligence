// app/layout.tsx

import MobileInstallHint from './components/MobileInstallHint'
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import AutoRefresh from "@/app/components/AutoRefresh";

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#020617',
}

export const metadata: Metadata = {
  title: "Collector Intelligence",
  description: "Collector Intelligence OS for serious music collectors.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-6 py-8 text-sm text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} Collector Intelligence. All rights reserved.</p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/about" className="hover:text-amber-300">About</Link>
          <Link href="/pricing" className="hover:text-amber-300">Pricing</Link>
          <Link href="/account" className="hover:text-amber-300">Account</Link>
          <Link href="/privacy" className="hover:text-amber-300">Privacy</Link>
          <Link href="/terms" className="hover:text-amber-300">Terms</Link>
          <Link href="/contact" className="hover:text-amber-300">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AutoRefresh />
        {children}
        <SiteFooter />
        <MobileInstallHint />
      </body>
    </html>
  );
}
