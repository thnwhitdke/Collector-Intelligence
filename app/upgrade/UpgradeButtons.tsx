"use client";

async function startCheckout(priceId: string) {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId }),
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error ?? "Unable to start checkout.");
    return;
  }

  window.location.href = data.url;
}

export default function UpgradeButtons() {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <button
        onClick={() => startCheckout(process.env.NEXT_PUBLIC_STRIPE_COLLECTOR_PRICE_ID!)}
        className="rounded-xl bg-amber-300 px-5 py-3 font-black text-slate-950"
      >
        Upgrade to Collector — $4.99/mo
      </button>

      <button
        onClick={() => startCheckout(process.env.NEXT_PUBLIC_STRIPE_FOUNDER_PRICE_ID!)}
        className="rounded-xl border border-amber-300/40 px-5 py-3 font-black text-amber-300"
      >
        Founder — $49/year
      </button>
    </div>
  );
}
