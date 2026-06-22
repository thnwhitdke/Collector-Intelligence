import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 150;

function buildPopsikeUrl(searchQuery: string) {
  const encoded = encodeURIComponent(searchQuery).replace(/%20/g, "+");
  return `https://www.popsike.com/php/quicksearch.php?searchtext=${encoded}&sortord=ddate`;
}


function cleanSearchPart(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function displayArtistName(value: unknown): string {
  const raw = cleanSearchPart(value);

  if (!raw.includes(",")) return raw;

  const [last, ...rest] = raw.split(",");
  const first = rest.join(" ").trim();

  if (!last.trim() || !first) return raw;

  return `${first} ${last.trim()}`;
}

function uniqueSearchQueries(record: any): string[] {
  const artist = cleanSearchPart(record.artist);
  const displayArtist = displayArtistName(record.artist);
  const title = cleanSearchPart(record.title);
  const catalogue = cleanSearchPart(record.catalogue_number);
  const label = cleanSearchPart(record.label);
  const country = cleanSearchPart(record.country);
  const year = cleanSearchPart(String(record.year ?? ""));

  const titleNoParenthetical = title
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const queries = [
    [displayArtist, title, label, catalogue].filter(Boolean).join(" "),
    [displayArtist, title, label].filter(Boolean).join(" "),
    [displayArtist, title, catalogue].filter(Boolean).join(" "),
    [displayArtist, title, country, year].filter(Boolean).join(" "),
    [displayArtist, title, "promo"].filter(Boolean).join(" "),
    [artist, title, catalogue].filter(Boolean).join(" "),
    [artist, title].filter(Boolean).join(" "),
    [artist, titleNoParenthetical].filter(Boolean).join(" "),
    [title, catalogue].filter(Boolean).join(" "),
    title,
  ].filter((query) => query.trim().length > 0);

  return Array.from(new Set(queries));
}

function cleanText(value: string | null) {
  if (!value) return null;
  return value
    .replace(/&ndash;/g, "–")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAuctionDate(raw: string | null) {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}


function normalizeMatchText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactMatchText(value: unknown): string {
  return normalizeMatchText(value).replace(/\s+/g, "");
}

function invertedArtistName(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";

  if (!raw.includes(",")) return raw;

  const [last, ...rest] = raw.split(",");
  const first = rest.join(" ").trim();

  if (!last.trim() || !first) return raw;

  return `${first} ${last.trim()}`;
}

function scorePopsikeMatch(record: any, auctionTitle: string | null) {
  const title = normalizeMatchText(auctionTitle);
  const compactTitle = compactMatchText(auctionTitle);

  const artist = normalizeMatchText(record.artist);
  const invertedArtist = normalizeMatchText(invertedArtistName(record.artist));
  const recordTitle = normalizeMatchText(record.title);
  const catalogue = normalizeMatchText(record.catalogue_number);
  const compactCatalogue = compactMatchText(record.catalogue_number);

  const artistHit =
    (artist.length > 0 && title.includes(artist)) ||
    (invertedArtist.length > 0 && title.includes(invertedArtist));

  const titleHit = recordTitle.length > 0 && title.includes(recordTitle);

  const catalogueHit =
    (catalogue.length > 0 && title.includes(catalogue)) ||
    (compactCatalogue.length > 0 && compactTitle.includes(compactCatalogue));

  if (catalogueHit && (artistHit || titleHit)) {
    return {
      confidence: "exact_catalog_match",
      match_quality: "exact_pressing_match",
      valuation_eligible: true,
    };
  }

  if (artistHit && titleHit) {
    return {
      confidence: "strong_artist_title_match",
      match_quality: "strong_release_match",
      valuation_eligible: true,
    };
  }

  if (titleHit) {
    return {
      confidence: "loose_title_match",
      match_quality: "loose_title_match",
      valuation_eligible: false,
    };
  }

  return {
    confidence: "weak_match",
    match_quality: "needs_review",
    valuation_eligible: false,
  };
}


function parsePopsikeSearchResults(html: string, maxLinks = 100) {
  const links: { href: string; articleNo: string }[] = [];

  const titleRegex =
    /<h5 class=["']add-title["'][\s\S]*?<a[^>]+href=['"](?:\.\.)?(\/[^'"]+?\/(\d+)\.html)['"][^>]*>/gi;

  for (const match of html.matchAll(titleRegex)) {
    links.push({ href: match[1], articleNo: match[2] });
    if (links.length >= maxLinks) break;
  }

  return links;
}

function parsePopsikeDetail(html: string, record: any, searchQuery: string, href: string, articleNo: string) {
  const titleMatch = html.match(/<span class=["']auto-title left["'][^>]*>([\s\S]*?)<\/span>/i);
  const auctionTitle = cleanText(titleMatch?.[1] ?? null);

  const soldForBlockMatch = html.match(
    /<span class=["']media-heading["'][^>]*>([\s\S]*?)<\/span>\s*<span class=["']data-type["'][^>]*>\s*Sold For\s*<\/span>/i
  );

  const soldForText = cleanText(soldForBlockMatch?.[1] ?? null);

  const normalizedSoldForText = soldForText
    ?.replace(/&nbsp;?/gi, " ")
    ?.replace(/\s+/g, " ")
    ?.trim();

  const soldForMatch =
    normalizedSoldForText?.match(
      /(&pound;|&euro;|&#36;|\$|£|€)\s*([0-9][0-9,.]*)/i
    ) ?? null;

  const soldDateBlockMatch = html.match(
    /<span class=["']media-heading["'][^>]*>([\s\S]*?)<\/span>\s*<span class=["']data-type["'][^>]*>\s*Sold Date\s*<\/span>/i
  );

  const soldDateText = cleanText(soldDateBlockMatch?.[1] ?? null);
  const soldDateMatch = soldDateText?.match(/([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/) ?? null;

  if (!auctionTitle || !soldForMatch) return null;

  const symbol = soldForMatch[1];
  const salePrice = Number(soldForMatch[2].replace(/,/g, ""));

  if (!Number.isFinite(salePrice)) return null;

  const currency =
    symbol === "$" || symbol === "&#36;" ? "USD" :
    symbol === "€" || symbol === "&euro;" ? "EUR" :
    symbol === "£" || symbol === "&pound;" ? "GBP" :
    "UNKNOWN";

  const matchQuality = scorePopsikeMatch(record, auctionTitle);

  return {
    record_id: record.id,
    source: "popsike",
    artist: record.artist,
    title: record.title,
    auction_title: auctionTitle,
    auction_date: parseAuctionDate(soldDateMatch?.[1] ?? null),
    sale_price: salePrice,
    currency,
    source_record_url: `https://www.popsike.com${href}`,
    confidence: matchQuality.confidence,
    raw_payload: {
      article_no: articleNo,
      search: searchQuery,
      discogs_release_id: record.discogs_release_id ?? null,
      catalogue_number: record.catalogue_number ?? null,
      match_quality: matchQuality.match_quality,
      valuation_eligible: matchQuality.valuation_eligible,
      parsed_from: "popsike_detail_page"
    }
  };
}


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedBatchSize = Number(searchParams.get("batchSize") ?? DEFAULT_BATCH_SIZE);
  const requestedRecordId = Number(searchParams.get("recordId") ?? 0);
  const manualQuery = cleanSearchPart(searchParams.get("query"));
  const batchSize = Math.min(
    MAX_BATCH_SIZE,
    Math.max(1, Number.isFinite(requestedBatchSize) ? requestedBatchSize : DEFAULT_BATCH_SIZE)
  );
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const popsikeSession = process.env.POPSIKE_PHPSESSID;

  if (!supabaseUrl || !serviceRoleKey || !popsikeSession) {
    return NextResponse.json({
      ok: false,
      error: "Missing required environment variables"
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let jobsQuery = supabase
    .from("external_market_comp_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at")
    .limit(batchSize);

  if (Number.isFinite(requestedRecordId) && requestedRecordId > 0) {
    const { data: existingJob } = await supabase
      .from("external_market_comp_queue")
      .select("*")
      .eq("record_id", requestedRecordId)
      .eq("status", "pending")
      .maybeSingle();

    if (!existingJob) {
      await supabase.from("external_market_comp_queue").insert({
        record_id: requestedRecordId,
        status: "pending",
        attempts: 0,
      });
    }

    jobsQuery = supabase
      .from("external_market_comp_queue")
      .select("*")
      .eq("record_id", requestedRecordId)
      .eq("status", "pending")
      .order("created_at")
      .limit(1);
  }

  const { data: jobs, error: jobError } = await jobsQuery;

  if (jobError) {
    return NextResponse.json({ ok: false, error: jobError.message });
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ ok: true, message: "No pending jobs" });
  }

  const results = [];

  for (const job of jobs) {
    const { data: record, error: recordError } = await supabase
      .from("records_clean_safe")
      .select("id, artist, title, label, catalogue_number, country, year, discogs_release_id")
      .eq("id", job.record_id)
      .single();

    if (recordError || !record) {
      await supabase
        .from("external_market_comp_queue")
        .update({
          status: "failed",
          attempts: (job.attempts ?? 0) + 1,
          last_error: recordError?.message ?? "Record not found",
          processed_at: new Date().toISOString()
        })
        .eq("id", job.id);

      results.push({
        queueId: job.id,
        recordId: job.record_id,
        status: "failed",
        error: recordError?.message ?? "Record not found"
      });

      continue;
    }

    const searchQueries = manualQuery
      ? [manualQuery, ...uniqueSearchQueries(record)]
      : uniqueSearchQueries(record);
    let bestRows: any[] = [];
    let bestSearchQuery = searchQueries[0] ?? "";
    const attemptedQueries: string[] = [];

    try {
      for (const searchQuery of searchQueries) {
        attemptedQueries.push(searchQuery);

        const response = await fetch(buildPopsikeUrl(searchQuery), {
          headers: {
            "User-Agent": "Mozilla/5.0 Collector Intelligence",
            "Cookie": `PHPSESSID=${popsikeSession}`
          },
          cache: "no-store"
        });

        const html = await response.text();

        if (html.toLowerCase().includes("popsike.com - login")) {
          await supabase
            .from("external_market_comp_queue")
            .update({
              status: "failed",
              attempts: (job.attempts ?? 0) + 1,
              last_error: "Popsike session expired or login required",
              processed_at: new Date().toISOString()
            })
            .eq("id", job.id);

          results.push({
            queueId: job.id,
            recordId: record.id,
            status: "failed",
            error: "Popsike session expired or login required"
          });

          continue;
        }

        const links = parsePopsikeSearchResults(html, manualQuery ? 150 : 50);
        const candidateRows = [];

        for (const link of links) {
          const detailResponse = await fetch(`https://www.popsike.com${link.href}`, {
            headers: {
              "User-Agent": "Mozilla/5.0 Collector Intelligence",
              "Cookie": `PHPSESSID=${popsikeSession}`
            },
            cache: "no-store"
          });

          const detailHtml = await detailResponse.text();

          const detailRow = parsePopsikeDetail(
            detailHtml,
            record,
            searchQuery,
            link.href,
            link.articleNo
          );

          if (detailRow) candidateRows.push(detailRow);
          if (candidateRows.length >= (manualQuery ? 50 : 15)) break;
        }

        if (candidateRows.length > bestRows.length) {
          bestRows = candidateRows;
          bestSearchQuery = searchQuery;
        }

        if (!manualQuery && candidateRows.length >= 5) {
          break;
        }
      }

      const rows = bestRows;
      let insertedCount = 0;

      if (rows.length > 0) {
        const { data: inserted, error: insertError } = await supabase
          .from("external_market_comps")
          .upsert(rows, {
            onConflict: "record_id,source,source_record_url",
            ignoreDuplicates: true
          })
          .select("id");

        if (insertError) {
          await supabase
            .from("external_market_comp_queue")
            .update({
              status: "failed",
              attempts: (job.attempts ?? 0) + 1,
              last_error: insertError.message,
              processed_at: new Date().toISOString()
            })
            .eq("id", job.id);

          results.push({
            queueId: job.id,
            recordId: record.id,
            status: "failed",
            error: insertError.message
          });

          continue;
        }

        insertedCount = inserted?.length ?? 0;
      }

      await supabase
        .from("external_market_comp_queue")
        .update({
          status: "completed",
          attempts: (job.attempts ?? 0) + 1,
          comps_found: insertedCount,
          completed_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
          last_error: null
        })
        .eq("id", job.id);

      results.push({
        queueId: job.id,
        recordId: record.id,
        status: "completed",
        compsFound: insertedCount,
        searchQuery: bestSearchQuery,
        attemptedQueries
      });
    } catch (error) {
      await supabase
        .from("external_market_comp_queue")
        .update({
          status: "failed",
          attempts: (job.attempts ?? 0) + 1,
          last_error: String(error),
          processed_at: new Date().toISOString()
        })
        .eq("id", job.id);

      results.push({
        queueId: job.id,
        recordId: record.id,
        status: "failed",
        error: String(error)
      });
    }
  }

  return NextResponse.json({
    ok: true,
    batchSize,
    processed: results.length,
    results
  });
}
