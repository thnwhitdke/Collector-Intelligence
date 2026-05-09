"use client";

import { WorldMap } from "react-svg-worldmap";

type Props = {
  countryCounts: Record<string, number>;
};

function convertCountryToISO(country: string) {
  const mapping: Record<string, string> = {
    USA: "us",
    "United States": "us",
    UK: "gb",
    "United Kingdom": "gb",
    Germany: "de",
    France: "fr",
    Japan: "jp",
    Canada: "ca",
    Italy: "it",
    Australia: "au",
    Netherlands: "nl",
    Sweden: "se",
  };

  return mapping[country] || "us";
}

export default function GlobalMap({
  countryCounts,
}: Props) {
  const data = Object.entries(countryCounts).map(
    ([country, value]) => ({
      country: convertCountryToISO(country) as any,
      value,
    })
  );

  return (
    <div className="bg-zinc-950 border border-yellow-900/20 rounded-3xl p-6">
      <h2 className="text-3xl font-bold mb-6">
        Collection Density Map
      </h2>

      <div className="bg-black rounded-2xl p-4">
        <WorldMap
          color="#facc15"
          title=""
          size="responsive"
          data={data}
         tooltipTextFunction={(context: any) =>
  `${context.countryName}: ${context.value || 0} records`
}
        />
      </div>
    </div>
  );
}