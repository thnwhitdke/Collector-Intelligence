import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BATCH_SIZE = 25;

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

function uniqueSearchQueries(record: any): string[] {
  const artist = cleanSearchPart(record.artist);
  const title = cleanSearchPart(record.title);
  const catalogue = cleanSearchPart(record.catalogue_number);

  const titleNoParenthetical = title
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const queries = [
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
    .replace(/\s+/g, " ")
    .trim();
}

function parseAuctionDate(raw: string | null) {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function parsePopsikeResults(html: string, record: any, searchQuery: string) {
  const articleIds = Array.from(
    html.matchAll(/<div class='item-list make-list' id='p(\d+)'/g)
  ).map((match) => match[1]);

  const rows = [];

  for (const articleNo of articleIds.slice(0, 25)) {
    const start = html.indexOf(`id='p${articleNo}'`);
    const next = html.indexOf("<div class='item-list make-list'", start + 1);
    const block = html.slice(start, next === -1 ? start + 9000 : next);

    const titleMatch = block.match(/<h5 class="add-title">[\s\S]*?<a[^>]+>([\s\S]*?)<\/a>/);
    const dateMatch = block.match(/([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/);
    const priceMatch = block.match(/class="item-price"[\s\S]*?<b>\s*([$€£])\s*<\/b>[\s\S]*?<b>\s*([0-9][0-9,.]*)\s*<\/b>/);
    const hrefMatch = block.match(new RegExp("href=\\.\\.(/[^>]+?/" + articleNo + "\\.html)"));

    if (!titleMatch || !dateMatch || !priceMatch) continue;

    const symbol = priceMatch[1];
    const currency =
      symbol === "$" ? "USD" :
      symbol === "€" ? "EUR" :
      symbol === "£" ? "GBP" :
      "UNKNOWN";

    const salePrice = Number(priceMatch[2].replace(/,/g, ""));
    if (!Number.isFinite(salePrice)) continue;

    rows.push({
      record_id: record.id,
      source: "popsike",
      artist: record.artist,
      title: record.title,
      auction_title: cleanText(titleMatch[1]),
      auction_date: parseAuctionDate(dateMatch[1]),
      sale_price: salePrice,
      currency,
      source_record_url: hrefMatch ? `https://www.popsike.com${hrefMatch[1]}` : null,
      confidence: "imported",
      raw_payload: {
        article_no: articleNo,
        search: searchQuery,
        discogs_release_id: record.discogs_release_id ?? null,
        catalogue_number: record.catalogue_number ?? null
      }
    });
  }

  return rows;
}

export async function GET() {
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

  const { data: jobs, error: jobError } = await supabase
    .from("external_market_comp_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at")
    .limit(BATCH_SIZE);

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
      .select("id, artist, title, catalogue_number, discogs_release_id")
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

    const searchQueries = uniqueSearchQueries(record);
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

        const candidateRows = parsePopsikeResults(html, record, searchQuery);

        if (candidateRows.length > bestRows.length) {
          bestRows = candidateRows;
          bestSearchQuery = searchQuery;
        }

        if (candidateRows.length >= 5) {
          break;
        }
      }

      const rows = bestRows;
      let insertedCount = 0;

      if (rows.length > 0) {
        const { data: inserted, error: insertError } = await supabase
          .from("external_market_comps")
          .upsert(rows, {
            onConflict: "source,source_record_url",
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
    batchSize: BATCH_SIZE,
    processed: results.length,
    results
  });
}
