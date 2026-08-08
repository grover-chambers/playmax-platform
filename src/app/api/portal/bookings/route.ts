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
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("client_id", client.id);

    const { data, error } = await supabase
      .from("bookings")
      .select("id, start_date, end_date, status, total_price, notes, inventory(name, location, type, size)")
      .eq("client_id", client.id)
      .order("start_date", { ascending: false })
      .range(from, to);

    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    return NextResponse.json({ bookings: data || [], total: count ?? 0 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}
