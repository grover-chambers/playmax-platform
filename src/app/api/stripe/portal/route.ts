import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { queryOne } from "@/lib/db";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface ClientRow {
  id: string;
  stripe_customer_id: string | null;
}

export async function POST() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await queryOne<ClientRow>(
      `SELECT id, stripe_customer_id
       FROM clients
       WHERE user_id = $1
       LIMIT 1`,
      [currentUser.id],
    );

    if (!client?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe billing account found" },
        { status: 404 },
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const session = await getStripe().billingPortal.sessions.create({
      customer: client.stripe_customer_id,
      return_url: `${siteUrl}/app/admin/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      { error: sanitizeError("Failed to create portal session") },
      { status: 500 },
    );
  }
}
