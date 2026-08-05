import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { query, queryOne } from "@/lib/db";
import { apiError, internalError } from "@/lib/errors";
import { withLogging } from "@/lib/request-log";
import Stripe from "stripe";

export const runtime = "nodejs";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

function tierFromPrice(priceId: string): string {
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) return "enterprise";
  return "free";
}

export const POST = withLogging(async function POST(request: Request) {
  try {
    if (!WEBHOOK_SECRET) {
      return internalError(
        new Error("STRIPE_WEBHOOK_SECRET is not configured"),
      );
    }

    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return apiError("missing_signature", "Missing stripe-signature header", 400);
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET);
    } catch {
      return apiError("invalid_signature", "Invalid signature", 400);
    }

    // Idempotency guard: a duplicate Stripe retry (same event id) short-circuits
    // here and does NOT re-run business logic.
    const inserted = await queryOne<{ id: number }>(
      `INSERT INTO webhook_events (stripe_event_id, event_type)
       VALUES ($1, $2)
       ON CONFLICT (stripe_event_id) DO NOTHING
       RETURNING id`,
      [event.id, event.type],
    );

    if (!inserted) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    try {
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

      await query(
        `UPDATE webhook_events SET status = 'processed', processed_at = now() WHERE id = $1`,
        [inserted.id],
      );

      return NextResponse.json({ received: true });
    } catch (err) {
      await query(
        `UPDATE webhook_events SET status = 'failed', processed_at = now() WHERE id = $1`,
        [inserted.id],
      ).catch(() => {});
      throw err;
    }
  } catch {
    return internalError(new Error("Webhook handler failed"));
  }
});
