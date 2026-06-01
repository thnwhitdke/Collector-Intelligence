"use server";

import * as cheerio from "cheerio";

export type PopsikeSaleRow = {
  artist?: string | null;
  title?: string | null;
  price?: string | null;
  saleDate?: string | null;
  url?: string | null;
};

export async function parsePopsikeHtml(
  html: string
): Promise<PopsikeSaleRow[]> {
  const $ = cheerio.load(html);

  const rows: PopsikeSaleRow[] = [];

  $("tr").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();

    if (!text) return;

    const link =
      $(el).find("a").attr("href") ?? null;

    rows.push({
      title: text,
      url: link,
    });
  });

  return rows.slice(0, 100);
}
