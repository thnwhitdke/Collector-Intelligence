type Props = {
  countryTotals: Record<string, number>;
};

export default function GlobalMap({
  countryTotals,
}: Props) {

  const countries =
    Object.entries(countryTotals)
      .sort((a, b) => b[1] - a[1]);

  const maxValue =
    countries.length > 0
      ? countries[0][1]
      : 1;

  return (

    <div
      className="
        rounded-2xl
        border
        border-[#2A241D]
        bg-[#17130F]
        p-6
        min-h-[650px]
        relative
        overflow-hidden
      "
    >

      {/* ambient background glow */}

      <div
        className="
          absolute
          inset-0
          opacity-20
          pointer-events-none
        "
      >

        <div
          className="
            absolute
            top-[-120px]
            left-[-120px]
            w-[320px]
            h-[320px]
            rounded-full
            bg-[#5B3DF5]
            blur-[120px]
          "
        />

        <div
          className="
            absolute
            bottom-[-120px]
            right-[-120px]
            w-[320px]
            h-[320px]
            rounded-full
            bg-[#00C2FF]
            blur-[120px]
          "
        />

      </div>

      <div className="relative z-10">

        <div className="mb-8">

          <div
            className="
              flex
              items-center
              justify-between
              flex-wrap
              gap-4
            "
          >

            <div>

              <h3 className="text-3xl font-bold">
                Global Collection Density
              </h3>

              <p className="text-[#9A8F80] mt-2">
                Geographic distribution of collection value
              </p>

            </div>

            <div
              className="
                flex
                items-center
                gap-3
                text-sm
              "
            >

              <div className="flex items-center gap-2">

                <div
                  className="
                    w-4
                    h-4
                    rounded-full
                    bg-[#5B3DF5]
                  "
                />

                <span className="text-[#9A8F80]">
                  Low
                </span>

              </div>

              <div className="flex items-center gap-2">

                <div
                  className="
                    w-4
                    h-4
                    rounded-full
                    bg-[#00C2FF]
                  "
                />

                <span className="text-[#9A8F80]">
                  Moderate
                </span>

              </div>

              <div className="flex items-center gap-2">

                <div
                  className="
                    w-4
                    h-4
                    rounded-full
                    bg-[#FFD166]
                  "
                />

                <span className="text-[#9A8F80]">
                  High
                </span>

              </div>

            </div>

          </div>

        </div>

        {/* faux world map visualization */}

        <div
          className="
            rounded-3xl
            border
            border-[#2A241D]
            bg-[#11100E]
            p-8
            mb-10
            relative
            overflow-hidden
            min-h-[260px]
          "
        >

          <div
            className="
              absolute
              inset-0
              opacity-10
              bg-[radial-gradient(circle_at_center,_#FFD166,_transparent_70%)]
            "
          />

          <div
            className="
              grid
              grid-cols-2
              md:grid-cols-4
              gap-6
              relative
              z-10
            "
          >

            {countries
              .slice(0, 8)
              .map(([country, value], index) => {

                const intensity =
                  (value / maxValue) * 100;

                return (

                  <div
                    key={country}
                    className="
                      rounded-2xl
                      border
                      border-[#2A241D]
                      bg-[#17130F]
                      p-5
                      backdrop-blur-sm
                    "
                  >

                    <div
                      className="
                        flex
                        items-center
                        justify-between
                        mb-4
                      "
                    >

                      <div
                        className="
                          w-4
                          h-4
                          rounded-full
                          bg-gradient-to-r
                          from-[#5B3DF5]
                          via-[#00C2FF]
                          to-[#FFD166]
                        "
                      />

                      <div
                        className="
                          text-xs
                          text-[#9A8F80]
                        "
                      >
                        #{index + 1}
                      </div>

                    </div>

                    <div className="font-bold text-lg">
                      {country}
                    </div>

                    <div
                      className="
                        text-[#FFD166]
                        font-bold
                        text-xl
                        mt-2
                      "
                    >
                      $
                      {Number(value).toLocaleString()}
                    </div>

                    <div
                      className="
                        mt-4
                        h-2
                        rounded-full
                        bg-[#221D17]
                        overflow-hidden
                      "
                    >

                      <div
                        className="
                          h-full
                          rounded-full
                          bg-gradient-to-r
                          from-[#5B3DF5]
                          via-[#00C2FF]
                          to-[#FFD166]
                        "
                        style={{
                          width: `${intensity}%`,
                        }}
                      />

                    </div>

                  </div>

                );

              })}

          </div>

        </div>

        {/* detailed market analytics */}

        <div className="space-y-4">

          {countries
            .slice(0, 20)
            .map(([country, value]) => {

              const percent =
                (value / maxValue) * 100;

              return (

                <div
                  key={country}
                  className="
                    rounded-xl
                    border
                    border-[#2A241D]
                    bg-[#11100E]
                    p-4
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      mb-3
                    "
                  >

                    <span className="font-medium">
                      {country}
                    </span>

                    <span
                      className="
                        text-[#C7A45D]
                        font-bold
                      "
                    >
                      $
                      {Number(value).toLocaleString()}
                    </span>

                  </div>

                  <div
                    className="
                      h-3
                      rounded-full
                      bg-[#221D17]
                      overflow-hidden
                    "
                  >

                    <div
                      className="
                        h-full
                        rounded-full
                        bg-gradient-to-r
                        from-[#5B3DF5]
                        via-[#00C2FF]
                        to-[#FFD166]
                      "
                      style={{
                        width: `${percent}%`,
                      }}
                    />

                  </div>

                </div>

              );

            })}

        </div>

      </div>

    </div>

  );

}