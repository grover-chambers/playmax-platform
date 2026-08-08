import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { requirePortalClient } from "@/lib/portal-guard";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    const portal = await requirePortalClient(supabase, currentUser);
    if (portal.response) return portal.response;
    const client = portal.client;

    const { data, error } = await supabase
      .from("conversations")
      .select("id, contact_name, channel, status, last_message_at, created_at")
      .eq("client_id", client.id)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    return NextResponse.json({ conversations: data || [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}
