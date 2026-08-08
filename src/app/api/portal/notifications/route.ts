import { NextRequest, NextResponse } from "next/server";
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
      .from("notifications")
      .select("id, type, title, message, link, read, created_at")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });

    const unreadCount = (data || []).filter((n) => !n.read).length;

    return NextResponse.json({ notifications: data || [], unreadCount });
  } catch {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    const portal = await requirePortalClient(supabase, currentUser);
    if (portal.response) return portal.response;
    const client = portal.client;

    const body = await req.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("client_id", client.id)
        .eq("read", false);
      if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    } else if (notificationId) {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("client_id", client.id);
      if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
