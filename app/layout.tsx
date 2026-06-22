// app/layout.tsx

import MobileInstallHint from './components/MobileInstallHint'
import type { Metadata } from "next";
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
    icon: [
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: [
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
  },
};

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
              <MobileInstallHint />
      </body>
    </html>
  );
}
