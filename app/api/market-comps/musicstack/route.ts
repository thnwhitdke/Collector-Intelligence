import { NextResponse } from "next/server";

export async function GET() {
  try {
    const query = "Pink Floyd The Wall";

    const searchUrl =
      `https://www.musicstack.com/show.cgi?find=${encodeURIComponent(query)}`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 Collector Intelligence Market Research"
      }
    });

    const html = await response.text();

    return NextResponse.json({
      ok: true,
      searched: query,
      htmlLength: html.length,
      preview: html.substring(0, 500)
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: String(error)
    });
  }
}
