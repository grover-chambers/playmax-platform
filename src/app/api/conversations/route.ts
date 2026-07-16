import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("conversations")
      .select("*, client:clients(name, company)")
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (currentUser.role === "crm_staff") {
      query = query.eq("assigned_to", currentUser.id);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });

    const conversations = (data || []).map((c) => ({
      id: c.id,
      contactName: c.contact_name,
      contactInitials: (c.contact_name || "")
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      channel: c.channel,
      preview: "",
      time: "",
      unread: 0,
      projectName: null,
      pipelineValue: null,
      status: c.status,
      autoReply: false,
    }));

    return NextResponse.json({ conversations });
  } catch {
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { client_id, contact_name, channel } = body;

    if (!client_id || !contact_name || !channel) {
      return NextResponse.json({ error: "Missing required fields: client_id, contact_name, channel" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        client_id,
        contact_name,
        channel,
        assigned_to: currentUser.id,
        status: "open",
        metadata: {},
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });

    return NextResponse.json({
      conversation: {
        id: data.id,
        contactName: data.contact_name,
        contactInitials: (data.contact_name || "")
          .split(" ")
          .map((w: string) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        channel: data.channel,
        preview: "",
        time: "now",
        unread: 0,
        projectName: null,
        pipelineValue: null,
        status: data.status,
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
