import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest
) {
  try {
    const releaseId =
      req.nextUrl.searchParams.get(
        "releaseId"
      );

    if (!releaseId) {
      return NextResponse.json(
        {
          error:
            "Missing releaseId",
        },
        {
          status: 400,
        }
      );
    }

    const targetUrl =
      `https://www.discogs.com/sell/release/${releaseId}`;

    const res = await fetch(
      targetUrl,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language":
            "en-US,en;q=0.9",
          Referer:
            "https://www.discogs.com/",
          DNT: "1",
        },
        cache: "no-store",
      }
    );

    console.log(
      "PROXY STATUS",
      res.status
    );

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            "Discogs proxy fetch failed",
          status:
            res.status,
        },
        {
          status:
            res.status,
        }
      );
    }

    const html =
      await res.text();

    return NextResponse.json({
      success: true,
      releaseId,
      html,
    });
  } catch (error) {
    console.error(
      "PROXY ERROR",
      error
    );

    return NextResponse.json(
      {
        error:
          "Marketplace proxy failed",
      },
      {
        status: 500,
      }
    );
  }
}