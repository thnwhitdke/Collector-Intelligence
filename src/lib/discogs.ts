type DiscogsImage = {
  uri?: string;
  uri150?: string;
  width?: number;
  height?: number;
  resource_url?: string;
  type?: string;
};

type DiscogsReleaseResponse = {
  id?: number;
  title?: string;
  images?: DiscogsImage[];
};

function getDiscogsHeaders() {
  const token = process.env.DISCOGS_TOKEN;
  const userAgent = process.env.DISCOGS_USER_AGENT;

  if (!token) {
    throw new Error("Missing DISCOGS_TOKEN in environment variables.");
  }

  if (!userAgent) {
    throw new Error("Missing DISCOGS_USER_AGENT in environment variables.");
  }

  return {
    Authorization: `Discogs token=${token}`,
    "User-Agent": userAgent,
  };
}

export function extractDiscogsReleaseIdFromUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null;

  const match = url.match(/\/release\/(\d+)/i);
  if (!match) return null;

  return match[1];
}

export async function fetchDiscogsReleaseCoverUrl(
  releaseId: string
): Promise<string | null> {
  if (!releaseId) return null;

  const headers = getDiscogsHeaders();

  const response = await fetch(`https://api.discogs.com/releases/${releaseId}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (response.status === 429) {
    throw new Error("Discogs rate limit reached (429). Please try again in a bit.");
  }

  if (!response.ok) {
    throw new Error(`Discogs release lookup failed with status ${response.status}.`);
  }

  const data = (await response.json()) as DiscogsReleaseResponse;

  if (!data.images || data.images.length === 0) {
    return null;
  }

  const primary = data.images.find((img) => img.type === "primary");
  if (primary?.uri) return primary.uri;

  const first = data.images[0];
  if (first?.uri) return first.uri;

  return null;
}