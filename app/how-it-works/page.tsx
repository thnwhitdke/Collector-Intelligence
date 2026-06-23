import Link from "next/link";

export const dynamic = "force-static";

export default function HowItWorksPage() {
return ( <main className="min-h-screen bg-[#090909] text-[#F4EFE6]"> <div className="mx-auto max-w-6xl px-6 py-16">


    <div className="text-center">
      <div className="text-sm uppercase tracking-[0.4em] text-cyan-300 font-black">
        Collector Intelligence
      </div>

      <h1 className="mt-4 text-6xl font-black">
        How Collector Intelligence Works
      </h1>

      <p className="mx-auto mt-6 max-w-3xl text-xl text-[#B8AA96]">
        Collector Intelligence transforms a record collection into an
        intelligence profile by analyzing rarity, demand, ownership,
        market activity, artist concentration, and historical data across
        millions of releases.
      </p>
    </div>

    <section className="mt-20">
      <h2 className="text-4xl font-black">What Makes Collector Intelligence Different?</h2>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-[#111111] p-8">
          <h3 className="text-2xl font-black">Traditional Collection Sites</h3>
          <ul className="mt-4 space-y-3 text-[#B8AA96]">
            <li>Catalog records</li>
            <li>Track ownership</li>
            <li>Display values</li>
            <li>Show marketplace listings</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-cyan-500/20 bg-[#111111] p-8">
          <h3 className="text-2xl font-black text-cyan-300">
            Collector Intelligence
          </h3>
          <ul className="mt-4 space-y-3 text-[#B8AA96]">
            <li>Measures rarity</li>
            <li>Calculates demand</li>
            <li>Analyzes collection DNA</li>
            <li>Tracks market signals</li>
            <li>Identifies opportunities</li>
            <li>Builds artist intelligence</li>
          </ul>
        </div>
      </div>
    </section>

    <section className="mt-20">
      <h2 className="text-4xl font-black">Understanding Your Collection DNA</h2>

      <p className="mt-6 text-[#B8AA96]">
        Collection DNA reveals the characteristics that make your collection unique.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl bg-[#111111] p-6">
          <h3 className="font-black">Artist Concentration</h3>
          <p className="mt-3 text-[#B8AA96]">
            How heavily your collection focuses on specific artists.
          </p>
        </div>

        <div className="rounded-3xl bg-[#111111] p-6">
          <h3 className="font-black">Genre Identity</h3>
          <p className="mt-3 text-[#B8AA96]">
            The musical profile of your collection.
          </p>
        </div>

        <div className="rounded-3xl bg-[#111111] p-6">
          <h3 className="font-black">Collection Depth</h3>
          <p className="mt-3 text-[#B8AA96]">
            How completely you pursue artists and catalogs.
          </p>
        </div>
      </div>
    </section>

    <section className="mt-20">
      <h2 className="text-4xl font-black">Key Intelligence Metrics</h2>

      <div className="mt-8 space-y-6">

        <div className="rounded-3xl bg-[#111111] p-8">
          <h3 className="text-2xl font-black">Demand Score</h3>
          <p className="mt-3 text-[#B8AA96]">
            Measures how actively collectors appear to seek a release.
          </p>
        </div>

        <div className="rounded-3xl bg-[#111111] p-8">
          <h3 className="text-2xl font-black">Rarity Score</h3>
          <p className="mt-3 text-[#B8AA96]">
            Measures how uncommon a release appears compared to the broader warehouse.
          </p>
        </div>

        <div className="rounded-3xl bg-[#111111] p-8">
          <h3 className="text-2xl font-black">Momentum Score</h3>
          <p className="mt-3 text-[#B8AA96]">
            Indicates whether collector interest is increasing or decreasing.
          </p>
        </div>

        <div className="rounded-3xl bg-[#111111] p-8">
          <h3 className="text-2xl font-black">Authority Score™</h3>
          <p className="mt-3 text-[#B8AA96]">
            A composite score combining rarity, demand, ownership,
            market activity, and historical significance.
          </p>
        </div>

      </div>
    </section>

    <section className="mt-20">
      <h2 className="text-4xl font-black">Artist Intelligence</h2>

      <p className="mt-6 text-[#B8AA96]">
        Artist Intelligence evaluates the significance of artists within
        your collection using ownership depth, rarity, demand, and collection focus.
      </p>
    </section>

    <section className="mt-20">
      <h2 className="text-4xl font-black">Market Intelligence</h2>

      <p className="mt-6 text-[#B8AA96]">
        Market Intelligence combines marketplace activity, valuation data,
        and historical auction intelligence to identify trends and opportunities.
      </p>
    </section>

    <section className="mt-20 text-center">
      <h2 className="text-5xl font-black">
        Discover What Your Collection Is Really Telling You
      </h2>

      <Link
        href="/auth/sign-up"
        className="mt-8 inline-flex rounded-2xl bg-cyan-500 px-8 py-4 font-black text-black"
      >
        Get Started
      </Link>
    </section>

  </div>
</main>


);
}

