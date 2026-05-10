import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function GET() {

  try {

    console.log(
      "========== ENRICHMENT START =========="
    );

    const DISCOGS_TOKEN =
      process.env.DISCOGS_TOKEN;

    if (!DISCOGS_TOKEN) {

      return NextResponse.json({
        error: "Missing DISCOGS_TOKEN",
      });
    }

    const { data: records, error } =
      await supabase
        .from("records_clean_safe")
.select("*")
.is("discogs_release_id", null)
.limit(25);

    if (error) {

      console.error(error);

      return NextResponse.json({
        error: error.message,
      });
    }

    let enriched = 0;

    for (const record of records || []) {

      try {

               // =========================
        // NORMALIZATION ENGINE
        // =========================

        let artist =
          record.artist || "";

        let title =
          record.title || "";

        // ARTIST NORMALIZATION

        if (
          artist.includes(",")
        ) {

          const parts =
            artist.split(",");

          if (
            parts.length === 2
          ) {

            artist =
              `${parts[1].trim()} ${parts[0].trim()}`;
          }
        }

        // TITLE CLEANUP

        title = title

          // remove quotes

          .replace(/["']/g, "")

          // remove parenthetical versions

          .replace(/\(.*?\)/g, "")

          // remove brackets

          .replace(/\[.*?\]/g, "")

          // remove slashes

          .replace(/\//g, " ")

          // collapse spaces

          .replace(/\s+/g, " ")

          .trim();

        // COMMON OCR FIXES

        title = title

          .replace(
            /Stardist/gi,
            "Stardust"
          )

          .replace(
            /Chares/gi,
            "Charles"
          );

        // FINAL QUERY

        const cleanQuery =
          `${artist} ${title}`;

        const query =
          encodeURIComponent(
            cleanQuery
          );

        console.log(
          "NORMALIZED QUERY:",
          cleanQuery
        );

        console.log(
          "SEARCHING:",
          query
        );

              // =========================
        // FALLBACK SEARCH PIPELINE
        // =========================
        // =========================
        // CACHE LOOKUP
        // =========================

        const normalizedKey =
          cleanQuery.toLowerCase();

        const {
          data: cachedMatch,
        } = await supabase
          .from(
            "discogs_match_cache"
          )
          .select("*")
          .eq(
            "normalized_query",
            normalizedKey
          )
          .single();

        let result = null;

        // =========================
        // USE CACHED MATCH
        // =========================

        if (
          cachedMatch?.discogs_release_id
        ) {

          console.log(
            "CACHE HIT:",
            cleanQuery
          );

          result = {

            id:
              cachedMatch.discogs_release_id,

            title:
              cachedMatch.discogs_title,
          };
        }
        const searchAttempts = [

          // full normalized query

          cleanQuery,

          // artist stripped

          title,

          // simplified title

          title
            .split(" ")
            .slice(0, 3)
            .join(" "),
        ];

        for (
          const attempt
          of searchAttempts
        ) {

          try {

            console.log(
              "SEARCH ATTEMPT:",
              attempt
            );

            const encoded =
              encodeURIComponent(
                attempt
              );

                     let data = null;

            // =====================
            // RETRY ENGINE
            // =====================

            for (
              let retry = 0;
              retry < 3;
              retry++
            ) {

              try {

                const response =
                  await fetch(
                    `https://api.discogs.com/database/search?q=${encoded}&type=release&token=${DISCOGS_TOKEN}`,
                    {
                      headers: {
                        "User-Agent":
                          "CollectorIntelligence/1.0",
                      },
                    }
                  );

                const text =
                  await response.text();

                if (!text) {

                  throw new Error(
                    "Empty response"
                  );
                }

                data =
                  JSON.parse(text);

                break;

              } catch (
                retryError
              ) {

                console.error(
                  `RETRY ${
                    retry + 1
                  } FAILED:`,
                  retryError
                );

                // exponential backoff

                await new Promise(
                  (
                    resolve
                  ) =>
                    setTimeout(
                      resolve,
                      1000 *
                        (
                          retry + 1
                        )
                    )
                );
              }
            }

            if (!data) {

              console.log(
                "ALL RETRIES FAILED"
              );

              continue;
            }

            const results =
              data?.results || [];

            if (
              results.length > 0
            ) {

              // =====================
              // CONFIDENCE SORTING
              // =====================

              const scored =
                results.map(
                  (
                    item: any
                  ) => {

                    let score = 0;

                    const itemTitle =
                      (
                        item.title ||
                        ""
                      ).toLowerCase();

                    const cleanArtist =
                      artist.toLowerCase();

                    const cleanTitle =
                      title.toLowerCase();

                    if (
                      itemTitle.includes(
                        cleanArtist
                      )
                    ) {
                      score += 50;
                    }

                    if (
                      itemTitle.includes(
                        cleanTitle
                      )
                    ) {
                      score += 50;
                    }

                    return {
                      item,
                      score,
                    };
                  }
                );

             scored.sort(
  (
    a: any,
    b: any
  ) =>
    b.score -
    a.score
);

const bestScore =
  scored[0]?.score || 0;

result =
  scored[0]?.item;

// =====================
// CONFIDENCE THRESHOLD
// =====================

if (bestScore < 70) {

  console.log(
    "LOW CONFIDENCE MATCH SKIPPED"
  );

  continue;
}

console.log(
  "BEST SCORE:",
  bestScore
);

              console.log(
                "MATCH FOUND:",
                result?.title
              );

                         console.log(
                "MATCH SCORE:",
                scored[0]?.score
              );

              // =====================
              // SAVE CACHE
              // =====================

              await supabase
                .from(
                  "discogs_match_cache"
                )
                .upsert({

                  normalized_query:
                    normalizedKey,

                  discogs_release_id:
                    result?.id,

                  discogs_title:
                    result?.title,

                  confidence_score:
                    scored[0]?.score || 0,
                });

              break;
            }

          } catch (
            searchError
          ) {

            console.error(
              "SEARCH FAILURE:",
              searchError
            );
          }
        }

        if (!result) {

          console.log(
            "NO MATCH:",
            cleanQuery
          );
          await supabase
            .from(
              "records_clean_safe"
            )
            .update({
              enrichment_status:
                "no_match",
            })
            .eq(
              "id",
              record.id
            );
          continue;
        }

        if (!result) {

          console.log(
            "NO MATCH:",
            query
          );

          continue;
        }

        console.log(
          "MATCH FOUND:",
          result.title
        );

        // =========================
        // FETCH RELEASE DETAILS
        // =========================

        const releaseResponse =
          await fetch(
            `https://api.discogs.com/releases/${result.id}?token=${DISCOGS_TOKEN}`,
            {
              headers: {
                "User-Agent":
                  "CollectorIntelligence/1.0",
              },
            }
          );

        const releaseData =
          await releaseResponse.json();

        // =========================
        // OLD VALUES
        // =========================

        const oldMedian =
          Number(
            record.discogs_median_price || 0
          );

        // =========================
        // MARKETPLACE VALUES
        // =========================

               // =========================
        // REAL MARKET VALUATION
        // =========================

        const marketplace =
          releaseData?.lowest_price;

        const newMedian =
          Number(
            marketplace || 0
          );

        const lowPrice =
          newMedian * 0.8;

        const highPrice =
          newMedian * 1.2;

        // =========================
        // VALUATION CONFIDENCE ENGINE
        // =========================

        let valuationConfidence =
          "HIGH";

        // reject tiny values

        if (
          newMedian < 1
        ) {

          valuationConfidence =
            "REJECTED";

          console.log(
            "REJECTED: UNDER $1"
          );

          continue;
        }

        // suspiciously high

        if (
          newMedian > 1000
        ) {

          valuationConfidence =
            "REVIEW";

          console.log(
            "FLAGGED FOR REVIEW: OVER $1000",
            newMedian
          );
        }

        // volatility analysis

        if (
          oldMedian &&
          oldMedian > 0
        ) {

          const rawPercent =
            (
              (
                newMedian -
                oldMedian
              ) /
              oldMedian
            ) * 100;

          // moderate volatility

          if (
            Math.abs(
              rawPercent
            ) > 100
          ) {

            valuationConfidence =
              "MEDIUM";
          }

          // major suspicious volatility

          if (
            Math.abs(
              rawPercent
            ) > 300
          ) {

            valuationConfidence =
              "REVIEW";

            console.log(
              "FLAGGED FOR REVIEW: SPIKE",
              rawPercent
            );
          }

          // absurd spikes rejected

          if (
            Math.abs(
              rawPercent
            ) > 10000
          ) {

            valuationConfidence =
              "REJECTED";

            console.log(
              "REJECTED: ABSURD SPIKE",
              rawPercent
            );

            continue;
          }
        }

        console.log(
          "VALUATION CONFIDENCE:",
          valuationConfidence
        );

        // =========================
        // METADATA
        // =========================

        const newCountry =
          result.country ||
          record.country ||
          null;

        const newGenre =
          Array.isArray(result.genre)
            ? result.genre.join(", ")
            : record.genre || null;

        const updatePayload = {

          country: newCountry,

          genre: newGenre,

          cover_url:
            result.cover_image ||
            record.cover_url ||
            null,

          discogs_release_id:
            result.id || null,

          discogs_low_price:
            lowPrice,

          discogs_median_price:
            newMedian,

          discogs_high_price:
            highPrice,

          value_last_updated:
            new Date().toISOString(),
        valuation_confidence:
            valuationConfidence,
        };

        const { error: updateError } =
          await supabase
            .from("records_clean_safe")
            .update(updatePayload)
            .eq("id", record.id);

        if (updateError) {

          console.error(
            "UPDATE ERROR:",
            updateError
          );

          continue;
        }

                // =========================
        // VALUE HISTORY SNAPSHOT
        // =========================

        const {
          error: historyError,
        } = await supabase
          .from("record_value_history")
          .insert({

            record_id:
              record.id,

            title:
              record.title,

            artist:
              record.artist,

            low_value:
              lowPrice,

            median_value:
              newMedian,

            high_value:
              highPrice,
          });

        if (historyError) {

          console.error(
            "HISTORY INSERT ERROR:",
            historyError
          );
        }

        // =========================
        // CHANGE TRACKING
        // =========================

                // =========================
        // CHANGE TRACKING
        // =========================

        const changes = [];

        // VALUE MOVEMENT

        if (
          oldMedian > 5 &&
          oldMedian !== newMedian
        ) {

          const changeAmount =
            newMedian - oldMedian;

          let changePercent =
  (
    (changeAmount /
      oldMedian) *
    100
  );

// cap insane swings

if (
  Math.abs(changePercent) > 200
) {

  changePercent =
    changePercent > 0
      ? 200
      : -200;
}

          changes.push({

            record_id:
              record.id,

            title:
              record.title,

            artist:
              record.artist,

            field_changed:
              "market_value",

            old_value:
              oldMedian,

            new_value:
              newMedian,

            change_amount:
              changeAmount,

            change_percent:
              changePercent,

            change_type:
              "valuation_update",
          });
        }

        // RELEASE IDENTIFIED

        if (
          record.discogs_release_id !==
          result.id
        ) {

          changes.push({

            record_id:
              record.id,

            title:
              record.title,

            artist:
              record.artist,

            field_changed:
              "discogs_release_id",

            old_value:
              null,

            new_value:
              null,

            change_amount:
              null,

            change_percent:
              null,

            change_type:
              "release_match",
          });
        }

         // =========================
        // INSERT CHANGES
        // =========================

        if (changes.length > 0) {

          const {
            error: changeError,
          } = await supabase
            .from("market_changes")
            .insert(changes);

          if (changeError) {

            console.error(
              "CHANGE INSERT ERROR:",
              changeError
            );
          }
        }

        enriched++;

        await new Promise(
          (resolve) =>
            setTimeout(resolve, 1000)
        );

      } catch (recordError) {

        console.error(
          "RECORD FAILURE:",
          recordError
        );
      }
    }

    console.log(
      "========== ENRICHMENT COMPLETE =========="
    );

    return NextResponse.json({

      success: true,

      enriched,

      total:
        records?.length || 0,

      message:
        `Enrichment complete. Updated ${enriched} records.`,
    });

  } catch (routeError) {

    console.error(
      "ROUTE FAILURE:",
      routeError
    );

    return NextResponse.json({
      error:
        "Unknown route error",
    });
  }
}