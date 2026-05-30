import CINavigation from "@/app/components/CINavigation";
import { createClient } from "../../../src/lib/supabase/server";

export default async function
ReviewIntelligencePage() {

  const supabase =
    await createClient();

  // =========================
  // LOAD RECORDS
  // =========================

  const {
    data: records,
  } = await supabase
    .from("records_clean_safe")
    .select(`
      id,
      canonical_display_title,
      discogs_image_url,
      genre,
      style,
      confidence_score,
      review_status,
      year
    `)
    .order(
      "confidence_score",
      {
        ascending: true,
      }
    )
    .limit(100);

  // =========================
  // METRICS
  // =========================

  const trusted =
    records?.filter(
      (r) =>
        r.review_status ===
        "trusted"
    ).length || 0;

  const review =
    records?.filter(
      (r) =>
        r.review_status ===
        "review"
    ).length || 0;

  const suspicious =
    records?.filter(
      (r) =>
        r.review_status ===
        "suspicious"
    ).length || 0;

  const avgConfidence =
    records?.length
      ? Math.round(
          records.reduce(
            (sum, r) =>
              sum +
              (r.confidence_score || 0),
            0
          ) / records.length
        )
      : 0;

  return (

    <div
      className="
        min-h-screen
        bg-black
        text-white
        p-8
      "
    >

      {/* Header */}

      <div
        className="
          flex
          items-center
          justify-between
          mb-10
        "
      >

        <div>

          <h1
            className="
              text-4xl
              font-bold
            "
          >
            Review Intelligence
          </h1>

          <p
            className="
              text-zinc-400
              mt-2
            "
          >
            Autonomous Metadata
            Governance System
          </p>

        </div>

      </div>

      {/* Metrics */}

      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-4
          gap-6
          mb-10
        "
      >

        {/* Trusted */}

        <div
          className="
            rounded-2xl
            border
            border-zinc-800
            bg-zinc-950
            p-6
          "
        >

          <p
            className="
              text-zinc-400
              text-sm
            "
          >
            Trusted
          </p>

          <h2
            className="
              text-4xl
              font-bold
              mt-2
              text-emerald-400
            "
          >
            {trusted}
          </h2>

        </div>

        {/* Review */}

        <div
          className="
            rounded-2xl
            border
            border-zinc-800
            bg-zinc-950
            p-6
          "
        >

          <p
            className="
              text-zinc-400
              text-sm
            "
          >
            Needs Review
          </p>

          <h2
            className="
              text-4xl
              font-bold
              mt-2
              text-yellow-400
            "
          >
            {review}
          </h2>

        </div>

        {/* Suspicious */}

        <div
          className="
            rounded-2xl
            border
            border-zinc-800
            bg-zinc-950
            p-6
          "
        >

          <p
            className="
              text-zinc-400
              text-sm
            "
          >
            Suspicious
          </p>

          <h2
            className="
              text-4xl
              font-bold
              mt-2
              text-red-400
            "
          >
            {suspicious}
          </h2>

        </div>

        {/* Avg Confidence */}

        <div
          className="
            rounded-2xl
            border
            border-zinc-800
            bg-zinc-950
            p-6
          "
        >

          <p
            className="
              text-zinc-400
              text-sm
            "
          >
            Avg Confidence
          </p>

          <h2
            className="
              text-4xl
              font-bold
              mt-2
              text-cyan-400
            "
          >
            {avgConfidence}%
          </h2>

        </div>

      </div>

      {/* Record Table */}

      <div
        className="
          rounded-2xl
          border
          border-zinc-800
          bg-zinc-950
          overflow-hidden
        "
      >

        <div
          className="
            p-6
            border-b
            border-zinc-800
          "
        >

          <h2
            className="
              text-xl
              font-semibold
            "
          >
            Intelligence Review Queue
          </h2>

        </div>

        <div
          className="
            divide-y
            divide-zinc-800
          "
        >

          {records?.map((record) => (

            <div
              key={record.id}
              className="
                flex
                items-center
                justify-between
                p-5
              "
            >

              {/* Left */}

              <div
                className="
                  flex
                  items-center
                  gap-4
                "
              >

                {/* Artwork */}

                <div
                  className="
                    w-16
                    h-16
                    rounded-xl
                    overflow-hidden
                    bg-zinc-900
                    border
                    border-zinc-800
                    flex-shrink-0
                  "
                >

                  {record.discogs_image_url ? (

                    <img
                      src={
                        record.discogs_image_url
                      }
                      alt="Artwork"
                      className="
                        w-full
                        h-full
                        object-cover
                      "
                    />

                  ) : (

                    <div
                      className="
                        w-full
                        h-full
                        flex
                        items-center
                        justify-center
                        text-zinc-700
                        text-xs
                      "
                    >
                      N/A
                    </div>

                  )}

                </div>

                {/* Metadata */}

                <div>

                  <p
                    className="
                      font-semibold
                      text-white
                    "
                  >
                    {
                      record
                        .canonical_display_title
                    }
                  </p>

                  <div
                    className="
                      flex
                      gap-2
                      mt-2
                      flex-wrap
                    "
                  >

                    {record.genre && (

                      <span
                        className="
                          text-xs
                          px-2
                          py-1
                          rounded-full
                          bg-emerald-950/40
                          text-emerald-300
                        "
                      >
                        {record.genre}
                      </span>

                    )}

                    {record.style && (

                      <span
                        className="
                          text-xs
                          px-2
                          py-1
                          rounded-full
                          bg-purple-950/40
                          text-purple-300
                        "
                      >
                        {record.style}
                      </span>

                    )}

                    {record.year && (

                      <span
                        className="
                          text-xs
                          px-2
                          py-1
                          rounded-full
                          bg-zinc-800
                          text-zinc-300
                        "
                      >
                        {record.year}
                      </span>

                    )}

                  </div>

                </div>

              </div>

              {/* Right */}

              <div
                className="
                  text-right
                "
              >

                <div
                  className={`
                    inline-block
                    px-3
                    py-1
                    rounded-full
                    text-xs
                    font-semibold

                    ${
                      record.review_status ===
                      "trusted"

                        ? "bg-emerald-950/40 text-emerald-300"

                        : record.review_status ===
                          "review"

                        ? "bg-yellow-950/40 text-yellow-300"

                        : "bg-red-950/40 text-red-300"
                    }
                  `}
                >

                  {
                    record.review_status
                  }

                </div>

                <p
                  className="
                    mt-2
                    text-sm
                    text-cyan-400
                    font-medium
                  "
                >
                  {
                    record.confidence_score
                  }%
                </p>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>

  );

}