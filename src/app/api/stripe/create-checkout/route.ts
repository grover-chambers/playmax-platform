import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { queryOne } from "@/lib/db";
import { sanitizeError } from "@/lib/errors";
import { withLogging } from "@/lib/request-log";

export const dynamic = "force-dynamic";

interface ClientRow {
  id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export const POST = withLogging(async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { priceId } = body;

    if (!priceId || typeof priceId !== "string") {
      return NextResponse.json(
        { error: "priceId is required" },
        { status: 400 },
      );
    }

    const client = await queryOne<ClientRow>(
      `SELECT id, stripe_customer_id, stripe_subscription_id
       FROM clients
       WHERE user_id = $1
       LIMIT 1`,
      [currentUser.id],
    );

    if (!client) {
      return NextResponse.json(
        { error: "No client account found" },
        { status: 404 },
      );
    }

    let stripeCustomerId = client.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({
        email: currentUser.email ?? undefined,
        metadata: { client_id: client.id },
      });
      stripeCustomerId = customer.id;

      await queryOne(
        `UPDATE clients SET stripe_customer_id = $1 WHERE id = $2`,
        [stripeCustomerId, client.id],
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: client.id,
      metadata: { price_id: priceId },
      success_url: `${siteUrl}/app/admin/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/app/admin/billing/upgrade`,
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      { error: sanitizeError("Failed to create checkout session") },
      { status: 500 },
    );
  }
});
