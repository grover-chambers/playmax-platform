import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { requirePortalClient } from "@/lib/portal-guard";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    const portal = await requirePortalClient(supabase, currentUser);
    if (portal.response) return portal.response;
    const client = portal.client;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { count } = await supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("client_id", client.id);

    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, amount, status, issued_date, due_date, paid_date, notes, line_items, project_id, projects(name)")
      .eq("client_id", client.id)
      .order("due_date", { ascending: false })
      .range(from, to);

    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    return NextResponse.json({ invoices: data || [], total: count ?? 0 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}
