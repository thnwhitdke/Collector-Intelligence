import { NextResponse } from "next/server";
import { stripe } from "@/src/lib/stripe/server";
import { createClient } from "@/src/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { priceId } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.collectorsintelligence.com";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please log in before upgrading." }, { status: 401 });
    }

    const tier =
      priceId === process.env.NEXT_PUBLIC_STRIPE_FOUNDER_PRICE_ID
        ? "founder"
        : "collector";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
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
      success_url: `${siteUrl}/account?success=1`,
      cancel_url: `${siteUrl}/upgrade?cancelled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout failed:", {
      message: error?.message,
      type: error?.type,
      code: error?.code,
    });

    return NextResponse.json(
      { error: error?.message ?? "Stripe checkout failed." },
      { status: 500 }
    );
  }
}
