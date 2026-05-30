import CINavigation from "@/app/components/CINavigation";
import { createClient } from "../../../src/lib/supabase/server";

export default async function
MarketIntelligenceDashboard() {

  const supabase =
    await createClient();

  // =========================
  // LOAD MARKET RECORDS
  // =========================

  const {
    data: records,
  } = await supabase
    .from("records_clean_safe")
    .select(`
      id,
      canonical_display_title,
      artist,
      title,
      discogs_image_url,
      estimated_value,
      confidence_score,
      market_velocity,
      market_last_updated,
      genre,
      year,
      review_status
    `)
    .order(
      "market_velocity",
      {
        ascending: false,
      }
    )
    .limit(50);

  const totalRecords =
    records?.length || 0;

  const avgValue =
    (records || []).reduce(
      (sum, r) =>
        sum +
        Number(
          r.estimated_value || 0
        ),
      0
    ) / (totalRecords || 1);

  const avgConfidence =
    (records || []).reduce(
      (sum, r) =>
        sum +
        Number(
          r.confidence_score || 0
        ),
      0
    ) / (totalRecords || 1);

  return (
    <div className="
      min-h-screen
      bg-black
      text-white
      p-8
    ">

      <CINavigation />

      {/* HEADER */}

      <div className="
        flex
        items-center
        justify-between
        mb-10
      ">

        <div>

          <p className="
            text-xs
            uppercase
            tracking-[0.3em]
            text-zinc-500
            mb-3
          ">
            Collector Intelligence
          </p>

          <h1 className="
            text-5xl
            font-black
            tracking-tight
          ">
            Market Intelligence
          </h1>

          <p className="
            text-zinc-400
            mt-4
            max-w-2xl
          ">
            Real-time collectible
            market analytics,
            valuation intelligence,
            and momentum tracking.
          </p>

        </div>

        <div className="
          bg-emerald-500/10
          border
          border-emerald-500/30
          rounded-3xl
          px-6
          py-5
        ">

          <p className="
            text-xs
            uppercase
            tracking-wider
            text-emerald-400
          ">
            System Status
          </p>

          <p className="
            text-2xl
            font-bold
            text-emerald-300
          ">
            LIVE
          </p>

        </div>

      </div>

      {/* KPI GRID */}

      <div className="
        grid
        grid-cols-1
        md:grid-cols-3
        gap-6
        mb-10
      ">

        <div className="
          rounded-3xl
          border
          border-zinc-800
          bg-zinc-950
          p-6
        ">
          <p className="
            text-zinc-500
            text-sm
          ">
            Tracked Records
          </p>

          <h2 className="
            text-5xl
            font-black
            mt-3
          ">
            {totalRecords}
          </h2>
        </div>

        <div className="
          rounded-3xl
          border
          border-zinc-800
          bg-zinc-950
          p-6
        ">
          <p className="
            text-zinc-500
            text-sm
          ">
            Avg Estimated Value
          </p>

          <h2 className="
            text-5xl
            font-black
            mt-3
          ">
            $
            {avgValue.toFixed(2)}
          </h2>
        </div>

        <div className="
          rounded-3xl
          border
          border-zinc-800
          bg-zinc-950
          p-6
        ">
          <p className="
            text-zinc-500
            text-sm
          ">
            Avg Confidence
          </p>

          <h2 className="
            text-5xl
            font-black
            mt-3
          ">
            {avgConfidence.toFixed(0)}%
          </h2>
        </div>

      </div>

      {/* HOT RECORDS */}

      <div className="
        rounded-3xl
        border
        border-zinc-800
        bg-zinc-950
        p-8
      ">

        <div className="
          flex
          items-center
          justify-between
          mb-8
        ">

          <div>

            <h2 className="
              text-3xl
              font-black
            ">
              Hot Market Records
            </h2>

            <p className="
              text-zinc-500
              mt-2
            ">
              Highest momentum records
              in your collection
            </p>

          </div>

        </div>

        <div className="
          space-y-4
        ">

          {records?.map((record) => (

            <div
              key={record.id}
              className="
                flex
                items-center
                justify-between
                rounded-2xl
                border
                border-zinc-800
                bg-black/40
                p-4
              "
            >

              <div className="
                flex
                items-center
                gap-4
              ">

                <img
                  src={
                    record.discogs_image_url ||
                    "https://placehold.co/100x100/111111/444444?text=VINYL"
                  }
                  alt="cover"
                  className="
                    w-20
                    h-20
                    rounded-xl
                    object-cover
                    border
                    border-zinc-800
                  "
                />

                <div>

                  <h3 className="
                    text-lg
                    font-bold
                  ">
                    {
                      record.canonical_display_title ||
                      "Unknown Record"
                    }
                  </h3>

                  <div className="
                    flex
                    items-center
                    gap-2
                    mt-2
                    flex-wrap
                  ">

                    {record.genre && (
                      <span className="
                        text-xs
                        px-2
                        py-1
                        rounded-full
                        bg-blue-500/20
                        text-blue-300
                      ">
                        {record.genre}
                      </span>
                    )}

                    {record.year && (
                      <span className="
                        text-xs
                        px-2
                        py-1
                        rounded-full
                        bg-zinc-800
                        text-zinc-300
                      ">
                        {record.year}
                      </span>
                    )}

                  </div>

                </div>

              </div>

              <div className="
                text-right
              ">

                <p className="
                  text-2xl
                  font-black
                ">
                  $
                  {
                    Number(
                      record.estimated_value || 0
                    ).toFixed(2)
                  }
                </p>

                <p className="
                  text-sm
                  text-emerald-400
                  mt-1
                ">
                  Velocity:
                  {" "}
                  {
                    Number(
                      record.market_velocity || 0
                    ).toFixed(2)
                  }
                </p>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}