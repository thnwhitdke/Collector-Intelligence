import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStripe } from "@/src/lib/stripe/server";
import { createAdminClient } from "@/src/lib/supabase/admin";

export const runtime = "nodejs";

function tierFromPrice(priceId?: string | null) {
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_FOUNDER_PRICE_ID) return "founder";
  return "collector";
}

async function updateProfileFromSubscription(subscription: Stripe.Subscription) {
  const supabase = createAdminClient();

  const userId = subscription.metadata?.supabase_user_id;
  const tier =
    subscription.metadata?.subscription_tier ||
    tierFromPrice(subscription.items.data[0]?.price?.id);

  if (!userId) {
    console.error("Missing supabase_user_id on subscription", subscription.id);
    return;
  }

  const status = subscription.status;
  const isActive = ["active", "trialing"].includes(status);

  const expiresAt =
    (subscription as any).current_period_end
      ? new Date((subscription as any).current_period_end * 1000).toISOString()
      : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_tier: isActive ? tier : "free",
      subscription_status: status,
      stripe_customer_id: String(subscription.customer),
      stripe_subscription_id: subscription.id,
      subscription_expires_at: expiresAt,
    })
    .eq("id", userId);

  if (error) {
    console.error("Profile subscription update failed:", error.message);
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = (await headers()).get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing Stripe signature config" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await updateProfileFromSubscription(event.data.object as Stripe.Subscription);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.subscription) {
      const subscription = await getStripe().subscriptions.retrieve(String(session.subscription));
      await updateProfileFromSubscription(subscription);
    }
  }

  return NextResponse.json({ received: true });
}
