// app/layout.tsx

import "./globals.css";
import AutoRefresh from "@/app/components/AutoRefresh";
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
      </body>
    </html>
  );
}