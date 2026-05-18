"use server";

import { logActivity } from "./activity";
import { createClient } from "@/src/lib/supabase/server";

export async function enrichSingleRecord(
  recordId: string
) {

  console.log(
    "ENRICHMENT STARTED:",
    recordId
  );

  const supabase =
    await createClient();

  try {

    // =========================
    // GET RECORD
    // =========================

    const {
      data: record,
      error,
    } = await supabase
      .from("records_clean_safe")
      .select("*")
      .eq("id", recordId)
      .single();

    if (error || !record) {

      console.error(
        "RECORD FETCH FAILED:",
        error
      );

      throw new Error(
        "Record not found"
      );

    }

    console.log(
      "RECORD FOUND:",
      {
        id: record.id,
        artist: record.artist,
        album: record.album,
      }
    );

    // =========================
    // BUILD SEARCH QUERY
    // =========================

    const rawArtist =
      record.artist || "";

    const rawTitle =
      record.album ||
      record.title ||
      "";

    const normalizeString = (
      value: string
    ) => {

      return value

        // Remove parentheses
        .replace(/\(.*?\)/g, "")

        // Remove brackets
        .replace(/\[.*?\]/g, "")

        // Remove quotes
        .replace(/["']/g, "")

        // Remove junk metadata
        .replace(
          /\b(LP|VINYL|REMASTERED|REISSUE|STEREO|MONO|LIMITED|EDITION)\b/gi,
          ""
        )

        // Normalize whitespace
        .replace(/\s+/g, " ")

        // Trim
        .trim();

    };

    const normalizedArtist =
      normalizeString(
        rawArtist
      );

    const normalizedTitle =
      normalizeString(
        rawTitle
      );

    const canonicalDisplayTitle =
      `${normalizedArtist} - ${normalizedTitle}`;

    const artist =
      normalizedArtist;

    const title =
      normalizedTitle;

    // =========================
    // FUZZY QUERY STRATEGY
    // =========================

    const queries = [

      // BEST MATCH
      `${artist} ${title}`,

      // ARTIST ONLY
      artist,

      // TITLE ONLY
      title,

      // CLEANED FALLBACK
      `${artist}`
        .replace(/-/g, " ")
        .trim() +

        " " +

        `${title}`
          .replace(/-/g, " ")
          .trim(),

    ];

    // =========================
    // DISCOGS SEARCH
    // =========================

    let data: any = null;

    let successfulQuery = "";

    for (const query of queries) {

      console.log(
        "🔎 Trying Discogs query:",
        query
      );

      const encodedQuery =
        encodeURIComponent(
          query
        );

      const response =
        await fetch(
          `https://api.discogs.com/database/search?q=${encodedQuery}&type=release`,
          {
            headers: {
              Authorization:
                `Discogs token ${process.env.DISCOGS_TOKEN}`,

              "User-Agent":
                "CollectorIntelligence/1.0",
            },

            cache: "no-store",
          }
        );

      console.log(
        "DISCOGS RESPONSE STATUS:",
        response.status
      );

      if (!response.ok) {

        continue;

      }

      data =
        await response.json();

      console.log(
        "DISCOGS RESULTS COUNT:",
        data.results?.length || 0
      );

      if (
        data.results &&
        data.results.length > 0
      ) {

        successfulQuery =
          query;

        console.log(
          "✅ MATCH FOUND:",
          successfulQuery
        );

        break;

      }

    }

    if (
      !data?.results ||
      data.results.length === 0
    ) {

      console.error(
        "❌ ALL FUZZY MATCHES FAILED",
        {
          recordId: record.id,

          rawArtist,

          rawTitle,

          normalizedArtist,

          normalizedTitle,

          attemptedQueries:
            queries,
        }
      );

    const failureReason = {
  type: "no_match",

  artist: normalizedArtist,

  title: normalizedTitle,

  attemptedQueries: queries,
};

console.error(
  "❌ ALL FUZZY MATCHES FAILED",
  failureReason
);

throw new Error(
  JSON.stringify(failureReason)
);

    }

    // =========================
    // BEST MATCH
    // =========================

    const match =
      data.results[0];
      let confidenceScore = 100;

// Lower confidence if fallback query used

if (
  successfulQuery !==
  `${artist} ${title}`
) {

  confidenceScore -= 20;

}

// Lower confidence if title mismatch

if (
  !match.title
    ?.toLowerCase()
    .includes(
      title.toLowerCase()
    )
) {

  confidenceScore -= 15;

}

// Lower confidence if artist mismatch

if (
  !match.title
    ?.toLowerCase()
    .includes(
      artist.toLowerCase()
    )
) {

  confidenceScore -= 15;

}

console.log(
  "🎯 CONFIDENCE SCORE:",
  confidenceScore
);

    console.log(
      "DISCOGS MATCH FOUND:",
      {
        id: match.id,
        title: match.title,
        cover: match.cover_image,
      }
    );

    // =========================
    // FETCH FULL RELEASE
    // =========================

    const releaseResponse =
      await fetch(
        `https://api.discogs.com/releases/${match.id}`,
        {
          headers: {
            Authorization:
              `Discogs token ${process.env.DISCOGS_TOKEN}`,

            "User-Agent":
              "CollectorIntelligence/1.0",
          },

          cache: "no-store",
        }
      );

    let releaseData: any = null;

    if (releaseResponse.ok) {

      releaseData =
        await releaseResponse.json();

      console.log(
        "FULL RELEASE DATA:",
        {
          id: releaseData.id,
          images:
            releaseData.images?.length || 0,
          year:
            releaseData.year,
        }
      );

    }

    // =========================
    // UPDATE RECORD
    // =========================

    const updates = {

      normalized_artist:
        normalizedArtist,

      normalized_title:
        normalizedTitle,

      canonical_display_title:
        canonicalDisplayTitle,

      confidence_score:
        confidenceScore,

      discogs_release_id:
        match.id || null,

      discogs_image_url:
        releaseData?.images?.[0]?.uri ||
        match.cover_image ||
        match.thumb ||
        null,

      discogs_thumbnail_url:
        releaseData?.images?.[0]?.uri150 ||
        match.thumb ||
        null,

      genre:
        releaseData?.genres?.join(", ") ||
        match.genre?.join(", ") ||
        null,

      label:
        match.label?.[0] ||
        null,

      country:
        match.country || null,

      year:
        releaseData?.year || null,

      style:
        releaseData?.styles?.join(", ") ||
        null,

      enrichment_status:
        "completed",

      enrichment_last_run:
        new Date().toISOString(),

      self_healed: true,

      last_self_heal_reason:
        "Discogs autonomous enrichment",
      review_status:

      confidenceScore >= 90
        ? "trusted"

      : confidenceScore >= 70
      ? "review"

      : "suspicious",

    };

    console.log(
      "UPDATING RECORD:",
      updates
    );

    const {
      error: updateError,
    } = await supabase
      .from("records_clean_safe")
      .update(updates)
      .eq("id", recordId);

    if (updateError) {

      console.error(
        "DATABASE UPDATE FAILED:",
        updateError
      );

      throw new Error(
        updateError.message
      );

    }

    console.log(
      "DATABASE UPDATE SUCCESS:",
      recordId
    );

    // =========================
    // ACTIVITY LOG SUCCESS
    // =========================

    await logActivity({
      userId: record.user_id,

      activityType:
        "record_enriched",

      entityType: "record",

      entityId: record.id,

      title:
        "Record enriched from Discogs",

      description:
        `${record.artist} - ${record.album}`,

      metadata: {

        canonical_display_title:
          canonicalDisplayTitle,

        confidence_score:
          confidenceScore,

        artist:
          normalizedArtist,

        title:
          normalizedTitle,

        artwork:
          releaseData?.images?.[0]?.uri ||
          match.cover_image ||
          match.thumb ||
          null,

        thumbnail:
          releaseData?.images?.[0]?.uri150 ||
          match.thumb ||
          null,

        discogs_release_id:
          match.id,

        year:
          releaseData?.year ||
          null,

        genre:
          releaseData?.genres ||
          match.genre ||
          [],

        style:
          releaseData?.styles ||
          [],

        country:
          releaseData?.country ||
          match.country ||
          null,

        label:
          releaseData?.labels?.[0]?.name ||
          match.label?.[0] ||
          null,

      },

      status: "success",
    });

    console.log(
      "ACTIVITY LOG SUCCESS:",
      recordId
    );

    console.log(
      "ENRICHMENT SUCCESS:",
      recordId
    );

    return {
      success: true,
      recordId,
      discogsId: match.id,
    };

  } catch (error) {

    console.error(
      "ENRICHMENT FAILED:",
      error
    );

    try {

      const supabase =
        await createClient();

      const {
        data: record,
      } = await supabase
        .from("records_clean_safe")
        .select("*")
        .eq("id", recordId)
        .single();

      if (record) {

        await logActivity({
          userId:
            record.user_id,

          activityType:
            "enrichment_failed",

          entityType:
            "record",

          entityId:
            record.id,

          title:
            "Discogs enrichment failed",

          description:
            `${record.artist} - ${record.album}`,

          metadata: {
            error:
              error instanceof Error
                ? error.message
                : "Unknown error",
          },

          status: "error",
        });

      }

    } catch (loggingError) {

      console.error(
        "FAILURE ACTIVITY LOG FAILED:",
        loggingError
      );

    }

    throw error;

  }

}