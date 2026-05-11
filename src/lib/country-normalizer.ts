export function normalizeCountry(country?: string | null) {

  if (!country) return "unknown";

  const cleaned =
    country
      .trim()
      .toLowerCase();

  const map: Record<string, string> = {

    usa: "united states of america",

    us: "united states of america",

    "united states": "united states of america",

    uk: "united kingdom",

    england: "united kingdom",

    russia: "russia",

    "south korea": "south korea",

    holland: "netherlands",

  };

  return map[cleaned] || cleaned;
}