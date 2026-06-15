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

    const matches =
      html.match(/\$[0-9,]+(?:\.[0-9]{2})?/g) || [];

    return NextResponse.json({
      ok: true,
      count: matches.length,
      first20: matches.slice(0, 20)
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: String(error)
    });
  }
}
