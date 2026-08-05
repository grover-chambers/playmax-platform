import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isStaff } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Staff inbox — messages belong to internal conversations, not the portal.
    if (!isStaff(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    let query = supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (currentUser.role === "crm_staff") {
      query = query.in(
        "conversation_id",
        (
          await supabase
            .from("conversations")
            .select("id")
            .eq("assigned_to", currentUser.id)
        ).data?.map((c) => c.id) || [],
      );
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    return NextResponse.json({ messages: data });
  } catch {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Staff inbox — only staff may write internal messages.
    if (!isStaff(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { conversation_id, direction, text, channel, sender_name, is_automation } = body;

    if (!conversation_id || !text || !channel) {
      return NextResponse.json({ error: "Missing required fields: conversation_id, text, channel" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id,
        direction: direction || "outbound",
        text,
        channel,
        sender_name: sender_name || currentUser.email?.split("@")[0] || "Staff",
        is_automation: is_automation || false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    return NextResponse.json({ message: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
  }
}
