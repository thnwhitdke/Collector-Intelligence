import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function buildPopsikeUrl(searchQuery: string) {
  const encoded = encodeURIComponent(searchQuery).replace(/%20/g, "+");
  return `https://www.popsike.com/php/quicksearch.php?searchtext=${encoded}&sortord=ddate`;
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

    const sourceRecordUrl = hrefMatch
      ? `https://www.popsike.com${hrefMatch[1]}`
      : null;

    rows.push({
      record_id: record.id,
      source: "popsike",
      artist: record.artist,
      title: record.title,
      auction_title: cleanText(titleMatch[1]),
      auction_date: parseAuctionDate(dateMatch[1]),
      sale_price: salePrice,
      currency,
      source_record_url: sourceRecordUrl,
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

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ ok: false, error: "Missing Supabase env vars" });
  }

  if (!popsikeSession) {
    return NextResponse.json({ ok: false, error: "Missing POPSIKE_PHPSESSID env var" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: job, error: jobError } = await supabase
    .from("external_market_comp_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (jobError) return NextResponse.json({ ok: false, error: jobError.message });
  if (!job) return NextResponse.json({ ok: true, message: "No pending jobs" });

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
        last_error: recordError?.message ?? "Record not found"
      })
      .eq("id", job.id);

    return NextResponse.json({
      ok: false,
      queueId: job.id,
      error: recordError?.message ?? "Record not found"
    });
  }

  const searchQuery = [
    record.artist,
    record.title,
    record.catalogue_number
  ].filter(Boolean).join(" ");

  const popsikeUrl = buildPopsikeUrl(searchQuery);

  const response = await fetch(popsikeUrl, {
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
        last_error: "Popsike session expired or login required"
      })
      .eq("id", job.id);

    return NextResponse.json({
      ok: false,
      queueId: job.id,
      error: "Popsike session expired or login required"
    });
  }

  const rows = parsePopsikeResults(html, record, searchQuery);

  let insertedCount = 0;

  if (rows.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from("external_market_comps")
      .insert(rows)
      .select("id");

    if (insertError) {
      await supabase
        .from("external_market_comp_queue")
        .update({
          status: "failed",
          attempts: (job.attempts ?? 0) + 1,
          last_error: insertError.message
        })
        .eq("id", job.id);

      return NextResponse.json({
        ok: false,
        queueId: job.id,
        error: insertError.message
      });
    }

    insertedCount = inserted?.length ?? 0;
  }

  const { error: updateError } = await supabase
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

  if (updateError) {
    return NextResponse.json({
      ok: false,
      queueId: job.id,
      error: updateError.message
    });
  }

  return NextResponse.json({
    ok: true,
    queueId: job.id,
    recordId: record.id,
    searchQuery,
    insertedCount,
    sample: rows.slice(0, 5).map((row) => ({
      auction_title: row.auction_title,
      sale_price: row.sale_price,
      currency: row.currency,
      auction_date: row.auction_date
    }))
  });
}
