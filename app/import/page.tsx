import CINavigation from "@/app/components/CINavigation";
import ImportPreviewClient from "./ImportPreviewClient";

export default function ImportPage() {
  return (
    <main className="min-h-screen bg-[#050403] px-6 py-8 text-[#F4EFE6]">
      <CINavigation />
      <ImportPreviewClient />
    </main>
  );
}
