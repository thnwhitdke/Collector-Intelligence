import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url =
      "https://www.popsike.com/php/quicksearch.php?searchtext=Pink+Floyd";

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const html = await response.text();

    return NextResponse.json({
      ok: true,
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
