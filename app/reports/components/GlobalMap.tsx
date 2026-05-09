type Props = {
  countryTotals: Record<string, number>;
};

export default function GlobalMap({
  countryTotals,
}: Props) {

  const countries =
    Object.entries(countryTotals);

  return (

    <div
      className="
        rounded-2xl
        border
        border-[#2A241D]
        bg-[#17130F]
        p-6
        min-h-[400px]
      "
    >

      <div className="mb-6">

        <h3 className="text-2xl font-bold">
          Global Collection Density
        </h3>

        <p className="text-[#9A8F80] mt-2">
          Collection value by country
        </p>

      </div>

      <div className="space-y-3">

        {countries
          .slice(0, 20)
          .map(([country, value]) => (

            <div
              key={country}
              className="
                flex
                items-center
                justify-between
                border-b
                border-[#2A241D]
                pb-2
              "
            >

              <span>
                {country}
              </span>

              <span className="text-[#C7A45D] font-bold">
                $
                {Number(value).toLocaleString()}
              </span>

            </div>

          ))}

      </div>

    </div>

  );

}