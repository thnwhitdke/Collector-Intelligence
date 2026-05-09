export function normalizeGenres(
  records: any[]
) {
  const genreMap: Record<
    string,
    number
  > = {};

  records.forEach((record) => {

    const rawGenre =
      record.genre || "";

    const genres =
      String(rawGenre)
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);

    genres.forEach((genre) => {

      genreMap[genre] =
        (genreMap[genre] || 0) + 1;

    });

  });

  return Object.entries(
    genreMap
  ).map(([name, value]) => ({
    name,
    value,
  }));
}

export function normalizeFormats(
  records: any[]
) {
  const formatMap: Record<
    string,
    number
  > = {};

  records.forEach((record) => {

    const rawFormat =
      record.format || "";

    const formats =
      String(rawFormat)
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);

    formats.forEach((format) => {

      formatMap[format] =
        (formatMap[format] || 0) + 1;

    });

  });

  return formatMap;
}

export function countryValueTotals(
  records: any[]
) {
  const countryMap: Record<
    string,
    number
  > = {};

  records.forEach((record) => {

    const country =
      record.country || "Unknown";

    const value =
      Number(
        record.estimated ||
        0
      );

    countryMap[country] =
      (countryMap[country] || 0) +
      value;

  });

  return countryMap;
}