import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isStaff } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isStaff(currentUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, message, link, read, created_at")
      .eq("user_id", currentUser.id)
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
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isStaff(currentUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { notificationId, markAllRead } = body;

    const baseQuery = supabase.from("notifications").update({ read: true }).eq("user_id", currentUser.id);

    if (markAllRead) {
      const { error } = await baseQuery.eq("read", false);
      if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    } else if (notificationId) {
      const { error } = await baseQuery.eq("id", notificationId);
      if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
