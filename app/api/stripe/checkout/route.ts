import { NextResponse } from "next/server";
import { stripe } from "@/src/lib/stripe/server";
import { createClient } from "@/src/lib/supabase/server";

export async function POST(req: Request) {
  const body = await req.json();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier =
    body.priceId === process.env.NEXT_PUBLIC_STRIPE_FOUNDER_PRICE_ID
      ? "founder"
      : "collector";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price: body.priceId,
        quantity: 1,
      },
    ],
    metadata: {
      supabase_user_id: user.id,
      subscription_tier: tier,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        subscription_tier: tier,
      },
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/account?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?cancelled=1`,
  });

  return NextResponse.json({
    url: session.url,
  });
}
