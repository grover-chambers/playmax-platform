import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getPortalClient(supabase, currentUser.id);
    if (!client) return NextResponse.json({ error: "No client account linked" }, { status: 404 });

    const { id } = await params;

    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, amount, status, issued_date, due_date, paid_date, notes, line_items, project_id, client_id, projects(name)")
      .eq("id", id)
      .single();

    if (error || !data) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (data.client_id !== client.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({
      invoice: {
        ...data,
        client_name: client.name,
        client_company: client.company,
        client_email: client.email,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 });
  }
}
