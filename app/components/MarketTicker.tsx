"use client";

import useSWR from "swr";

type MarketChange = {
  id: string;
  title: string;
  artist: string;
  field_changed: string;
  old_value: number | null;
  new_value: number | null;
  change_amount: number | null;
  change_percent: number | null;
  change_type: string;
  created_at: string;
  record_id: number;
};

const fetcher = async (
  url: string
) => {

  const response =
    await fetch(url);

  if (!response.ok) {

    throw new Error(
      "Failed to fetch market feed"
    );
  }

  return response.json();
};

function getTimeAgo(
  dateString: string
) {

  const seconds =
    Math.floor(
      (
        Date.now() -
        new Date(
          dateString
        ).getTime()
      ) / 1000
    );

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes =
    Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(minutes / 60);

  return `${hours}h ago`;
}

function getFriendlyLabel(
  field: string
) {

  switch (field) {

    case "market_value":
      return "VALUE UPDATE";

    case "discogs_release_id":
      return "DISCOGS MATCH";

    case "genre":
      return "GENRE UPDATE";

    case "country":
      return "COUNTRY UPDATE";

    default:
      return field
        .replaceAll("_", " ")
        .toUpperCase();
  }
}

export default function MarketTicker() {

  const {
    data: changes,
    error,
  } = useSWR<MarketChange[]>(
    "/api/market-feed",
    fetcher,
    {
      refreshInterval: 15000,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
    }
  );

  if (error) {

    return (
      <div className="w-full border-y border-red-900 bg-black px-4 py-3 text-sm text-red-400">
        Market feed unavailable
      </div>
    );
  }

  if (
    !changes ||
    changes.length === 0
  ) {

    return (
      <div className="w-full border-y border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-500">
        Waiting for market activity...
      </div>
    );
  }

  return (

    <div className="relative w-full overflow-hidden border-y border-yellow-900/20 bg-black py-3">

      <div className="animate-marquee flex gap-10 px-6">

        {[...changes, ...changes].map(
          (
            change,
            index
          ) => {

            const isPrice =
              change.change_percent !==
              null;

            const colors = [

              "text-cyan-400",

              "text-yellow-400",

              "text-emerald-400",

              "text-orange-400",

              "text-pink-400",

              "text-violet-400",
            ];

            const color =
              colors[
                index %
                  colors.length
              ];

            return (

              <div
                key={`${change.id}-${index}`}
                className={`flex items-center gap-3 whitespace-nowrap ${color}`}
              >

                <span className="text-lg font-black">

                  {isPrice
                    ? change.change_percent! >=
                      0
                      ? "▲"
                      : "▼"
                    : "◆"}

                </span>

                <span className="font-extrabold uppercase tracking-wide">

                  {change.artist?.replace(
                    ",",
                    ""
                  )}

                </span>

                <span className="text-white/90">

                  {change.title}

                </span>

                <span className="text-zinc-400 text-sm uppercase tracking-widest">

                  {isPrice
                    ? `${change.change_percent!.toFixed(
                        1
                      )}%`
                    : getFriendlyLabel(
                        change.field_changed
                      )}

                </span>

                <span className="text-zinc-600 text-xs">

                  {getTimeAgo(
                    change.created_at
                  )}

                </span>

                <span className="text-zinc-700">
                  ✦
                </span>

              </div>
            );
          }
        )}

      </div>

    </div>
  );
}