import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function buildPopsikeUrl(searchQuery: string) {
  const encoded = encodeURIComponent(searchQuery).replace(/%20/g, "+");
  return `https://www.popsike.com/php/quicksearch.php?searchtext=${encoded}&sortord=ddate`;
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

  if (recordError) return NextResponse.json({ ok: false, error: recordError.message });

  const searchQuery = [record.artist, record.title, record.catalogue_number]
    .filter(Boolean)
    .join(" ");

  const popsikeUrl = buildPopsikeUrl(searchQuery);

  const response = await fetch(popsikeUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 Collector Intelligence",
      "Cookie": `PHPSESSID=${popsikeSession}`
    },
    cache: "no-store"
  });

  const html = await response.text();

  const articleIds = Array.from(
    html.matchAll(/<div class='item-list make-list' id='p(\d+)'/g)
  ).map((match) => match[1]);

  const isLoginPage = html.toLowerCase().includes("popsike.com - login");

  return NextResponse.json({
    ok: true,
    queueId: job.id,
    recordId: record.id,
    searchQuery,
    popsikeStatus: response.status,
    htmlLength: html.length,
    isLoginPage,
    articleCount: articleIds.length,
    firstArticleIds: articleIds.slice(0, 5)
  });
}
