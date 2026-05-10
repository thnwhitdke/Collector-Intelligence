"use client";

import dynamic from "next/dynamic";

const WorldMap = dynamic(
  () =>
    import("react-svg-worldmap").then(
      (mod) => mod.WorldMap
    ),
  {
    ssr: false,
  }
);

type Props = {
  data: {
    country: string;
    value: number;
  }[];
};

export default function WorldMapClient({
  data,
}: Props) {

  return (

    <div className="w-full">

      <WorldMap
        color="#facc15"
        title=""
        size="responsive"
        data={data as any}
      />

    </div>

  );

}