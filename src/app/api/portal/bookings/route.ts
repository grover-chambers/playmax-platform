import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getPortalClient(supabase, currentUser.id);
    if (!client) return NextResponse.json({ error: "No client account linked" }, { status: 404 });

    const { data, error } = await supabase
      .from("bookings")
      .select("id, start_date, end_date, status, total_price, notes, inventory(name, location, type, size)")
      .eq("client_id", client.id)
      .order("start_date", { ascending: false });

    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    return NextResponse.json({ bookings: data || [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}
