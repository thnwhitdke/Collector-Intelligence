import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = String(searchParams.get("q") || "").trim();

  if (!q) {
    return NextResponse.json({ ok: true, results: [] });
  }

  const params = new URLSearchParams({
    type: "release",
    q,
    per_page: "20",
  });

  const response = await fetch(
    `https://api.discogs.com/database/search?${params.toString()}`,
    {
      headers: {
        Authorization: `Discogs token=${process.env.DISCOGS_TOKEN}`,
        "User-Agent":
          process.env.DISCOGS_USER_AGENT || "CollectorIntelligence/1.0",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: `Discogs search failed: ${response.status}`,
        results: [],
      },
      { status: response.status },
    );
  }

  const json = await response.json();

  const results = (json.results || []).slice(0, 20).map((item: any) => ({
    id: item.id,
    title: item.title,
    year: item.year ?? null,
    country: item.country ?? null,
    label: Array.isArray(item.label) ? item.label.join(", ") : item.label ?? null,
    catno: item.catno ?? null,
    format: Array.isArray(item.format) ? item.format.join(", ") : item.format ?? null,
    thumb: item.thumb ?? null,
    uri: item.uri ?? null,
  }));

  return NextResponse.json({ ok: true, results });
}
