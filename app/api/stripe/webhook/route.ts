import { NextResponse } from "next/server";
import { stripe, PLANS } from "@/lib/stripe";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Admin client — bypasses RLS, required for webhook (no user session)
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Reverse-lookup: Stripe price ID → plan name
function getPlanFromPriceId(priceId: string): "starter" | "growth" | "pro" | null {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) return key as "starter" | "growth" | "pro";
  }
  return null;
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.CheckoutSession;
      const userId = session.metadata?.user_id;
      const plan = session.metadata?.plan as "starter" | "growth" | "pro" | undefined;

      if (!userId || !plan) break;

      const { error } = await supabase
        .from("profiles")
        .update({
          plan,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
        })
        .eq("id", userId);

      if (error) console.error("Webhook checkout.session.completed error:", error);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price.id;
      const plan = priceId ? getPlanFromPriceId(priceId) : null;

      if (!plan) break;

      const { error } = await supabase
        .from("profiles")
        .update({ plan, stripe_subscription_id: subscription.id })
        .eq("stripe_customer_id", subscription.customer as string);

      if (error) console.error("Webhook customer.subscription.updated error:", error);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      const { error } = await supabase
        .from("profiles")
        .update({ plan: "trial", stripe_subscription_id: null })
        .eq("stripe_customer_id", subscription.customer as string);

      if (error) console.error("Webhook customer.subscription.deleted error:", error);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
