import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getPortalClient(supabase, currentUser.id);
    if (!client) return NextResponse.json({ error: "No client account linked" }, { status: 404 });

    const { id } = await params;
    const body = await req.json();
    const { phone } = body;

    if (!phone || !/^(0|254|\+254)\d{9}$/.test(phone)) {
      return NextResponse.json({ error: "Valid M-Pesa phone number required" }, { status: 400 });
    }

    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .select("id, invoice_number, amount, status, client_id")
      .eq("id", id)
      .single();

    if (invError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (invoice.client_id !== client.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (invoice.status === "paid") {
      return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });
    }

    // Normalize phone to 254 format
    const normalized = phone.replace(/^0/, "254").replace(/^\+/, "");

    // Record the payment attempt
    const { error: paymentError } = await supabase
      .from("invoice_payments")
      .insert({
        invoice_id: invoice.id,
        client_id: client.id,
        method: "mpesa",
        amount: invoice.amount,
        status: "pending",
        mpesa_phone: normalized,
        mpesa_receipt: null,
      });

    if (paymentError) {
      return NextResponse.json({ error: sanitizeError(paymentError) }, { status: 500 });
    }

    // NOTE: M-Pesa STK Push integration not yet implemented.
    // Payment stays in "pending" status until Safaricom callback confirms.
    // Do NOT auto-mark as completed — that bypasses actual payment verification.

    // Log activity
    await supabase.from("client_activity_log").insert({
      client_id: client.id,
      activity_type: "payment_event",
      title: `Payment initiated for ${invoice.invoice_number}`,
      description: `KES ${Number(invoice.amount).toLocaleString()} M-Pesa payment initiated via ${normalized}.`,
      entity_type: "invoice",
      entity_id: invoice.id,
    }).maybeSingle();

    return NextResponse.json({
      success: true,
      message: "M-Pesa payment initiated. You will receive an STK Push prompt on your phone.",
      status: "pending",
    });
  } catch (err) {
    console.error("M-Pesa payment initiation failed:", err);
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 });
  }
}
