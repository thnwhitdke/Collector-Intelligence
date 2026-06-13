import Link from "next/link";
import CINavigation from "@/app/components/CINavigation";
import { getSavedMoodSessions } from "@/app/actions/saved-mood-sessions-read";

export const dynamic = "force-dynamic";

function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatRuntime(seconds: number | null | undefined) {
  const safeSeconds = Number(seconds || 0);

  if (!Number.isFinite(safeSeconds) || safeSeconds <= 0) {
    return "Unknown runtime";
  }

  return `${Math.round(safeSeconds / 60)} min`;
}

export default async function MoodSessionsPage() {
  const sessions = await getSavedMoodSessions();

  return (
    <main className="min-h-screen bg-[#030303] px-6 py-6 text-zinc-100">
      <CINavigation />

      <section className="mx-auto max-w-7xl">
        <section className="rounded-[38px] border border-cyan-500/15 bg-gradient-to-br from-[#071214] via-black to-[#050403] p-8 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">
            Saved Mood Sessions
          </p>

          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">
                Listening Session Library
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                Saved listening journeys generated from your collection mood intelligence.
              </p>
            </div>

            <Link
              href="/collection/track-intelligence"
              className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-cyan-100 hover:bg-cyan-300/20"
            >
              Build New Session
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-5">
          {sessions.length === 0 ? (
            <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-8">
              <p className="text-2xl font-black text-white">
                No saved sessions yet.
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                Generate a mood session from Track Intelligence, then save it here.
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <article
                key={session.id}
                className="rounded-[30px] border border-white/10 bg-[#11100D] p-6"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                      {session.mood}
                    </p>

                    <h2 className="mt-2 text-3xl font-black text-white">
                      {session.title}
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">
                      {session.reason || session.prompt}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Runtime
                    </p>
                    <p className="mt-1 text-xl font-black text-[#D8B65A]">
                      {formatRuntime(session.estimated_runtime_seconds)}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      {formatDate(session.created_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Original Prompt
                  </p>
                  <p className="mt-2 text-sm text-zinc-300">
                    {session.prompt}
                  </p>
                </div>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
