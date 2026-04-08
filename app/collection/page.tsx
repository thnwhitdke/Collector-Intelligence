cd ~/collector-intelligence

cat > app/collection/page.tsx <<'EOF'
import { getRecords } from "../actions/records";

export default async function CollectionPage() {
  const records = await getRecords();

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl p-6">
        <h1 className="text-xl font-semibold mb-4">Your Collection</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {records.map((record: any) => (
            <div
              key={record.id}
              className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden hover:shadow-md transition"
            >
              <div className="aspect-square bg-neutral-100 grid place-items-center text-xs text-neutral-500">
                {record.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={record.cover_url}
                    alt={`${record.artist} - ${record.title}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  "No cover"
                )}
              </div>

              <div className="p-3">
                <div className="text-sm font-semibold leading-tight line-clamp-2">
                  {record.title}
                </div>
                <div className="text-xs text-neutral-600 line-clamp-1">
                  {record.artist}
                </div>
                <div className="text-xs text-neutral-400 mt-1">
                  {record.year ?? "—"} • {record.country ?? "—"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
EOF