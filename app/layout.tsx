cd ~/collector-intelligence

cat > app/layout.tsx <<'EOF'
import "./globals.css";

export const metadata = {
  title: "Collector Intelligence",
  description: "Track and analyze your vinyl collection",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
EOF