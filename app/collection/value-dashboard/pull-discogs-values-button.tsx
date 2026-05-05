"use client";

import { useTransition, useState } from "react";
import { pullNextDiscogsValues } from "../../actions/discogs-values";

export default function PullDiscogsValuesButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="rounded-3xl border border-[#3A2B18] bg-[#120F0A] p-5 shadow-2xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#BCA46A]">
            Discogs Value Pull
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#F4E8C8]">
            Pull the next small batch of market values
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#B8AA8A]">
            This safely pulls a small batch so the user experience feels clear and
            Discogs rate limits are easier to manage. Blocked or unavailable
            releases are marked so they stop clogging the value queue.
          </p>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              const result = await pullNextDiscogsValues(5);
              setMessage(result.message);
            });
          }}
          className="rounded-2xl bg-[#D8B65A] px-5 py-3 text-sm font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Pulling values..." : "Pull 5 Discogs Values"}
        </button>
      </div>

      {message ? (
        <div className="mt-4 rounded-2xl border border-[#4A3A1E] bg-black/30 px-4 py-3 text-sm text-[#F4E8C8]">
          {message}
        </div>
      ) : null}
    </div>
  );
}
