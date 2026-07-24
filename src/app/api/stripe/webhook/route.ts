import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { query } from "@/lib/db";
import { sanitizeError } from "@/lib/errors";
import Stripe from "stripe";

export const runtime = "nodejs";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

function tierFromPrice(priceId: string): string {
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) return "enterprise";
  return "free";
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET);
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clientId = session.client_reference_id;
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;

        if (!clientId || !stripeCustomerId || !stripeSubscriptionId) break;

        const priceId = session.metadata?.price_id ?? "";
        const tier = tierFromPrice(priceId);

        await query(
          `UPDATE clients
           SET stripe_customer_id = $1,
               stripe_subscription_id = $2,
               subscription_tier = $3
           WHERE id = $4`,
          [stripeCustomerId, stripeSubscriptionId, tier, clientId],
        );
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;

        if (!stripeCustomerId) break;

        const activePriceId = subscription.items.data[0]?.price?.id ?? "";
        const tier = subscription.status === "active"
          ? tierFromPrice(activePriceId)
          : "free";

        await query(
          `UPDATE clients
           SET subscription_tier = $1
           WHERE stripe_customer_id = $2`,
          [tier, stripeCustomerId],
        );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;

        if (!stripeCustomerId) break;

        await query(
          `UPDATE clients
           SET subscription_tier = 'free'
           WHERE stripe_customer_id = $1`,
          [stripeCustomerId],
        );
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: sanitizeError("Webhook handler failed") },
      { status: 500 },
    );
  }
}
