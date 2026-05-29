type DiscogsImage = {
  uri?: string;
  uri150?: string;
  width?: number;
  height?: number;
  resource_url?: string;
  type?: string;
};

export type DiscogsIdentifier = {
  type?: string;
  value?: string;
  description?: string;
};

export type DiscogsTrack = {
  position?: string;
  type_?: string;
  title?: string;
  duration?: string;
  artists?: { name?: string }[];
};

type DiscogsReleaseResponse = {
  id?: number;
  title?: string;
  images?: DiscogsImage[];
  identifiers?: DiscogsIdentifier[];
  tracklist?: DiscogsTrack[];
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

async function fetchDiscogsRelease(
  releaseId: string
): Promise<DiscogsReleaseResponse | null> {
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

  return (await response.json()) as DiscogsReleaseResponse;
}

export async function fetchDiscogsReleaseCoverUrl(
  releaseId: string
): Promise<string | null> {
  const data = await fetchDiscogsRelease(releaseId);

  if (!data?.images || data.images.length === 0) {
    return null;
  }

  const primary = data.images.find((img) => img.type === "primary");
  if (primary?.uri) return primary.uri;

  const first = data.images[0];
  if (first?.uri) return first.uri;

  return null;
}

export async function fetchDiscogsRunoutIdentifiers(
  releaseId: string
): Promise<DiscogsIdentifier[]> {
  const data = await fetchDiscogsRelease(releaseId);

  if (!data?.identifiers || data.identifiers.length === 0) {
    return [];
  }

  return data.identifiers.filter((identifier) => {
    const type = identifier.type?.toLowerCase() ?? "";
    return (
      type.includes("matrix") ||
      type.includes("runout") ||
      type.includes("matrix / runout")
    );
  });
}

export async function fetchDiscogsTracklist(
  releaseId: string
): Promise<DiscogsTrack[]> {
  const data = await fetchDiscogsRelease(releaseId);

  if (!data?.tracklist || data.tracklist.length === 0) {
    return [];
  }

  return data.tracklist.filter((track) => {
    return track.type_ === "track" && !!track.title;
  });
}
