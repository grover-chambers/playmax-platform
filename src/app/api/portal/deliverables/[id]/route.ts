import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function PUT(
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
    const { approval_status, client_feedback } = body;

    if (!approval_status || !["approved", "rejected"].includes(approval_status)) {
      return NextResponse.json({ error: "Invalid approval status" }, { status: 400 });
    }

    const { data: deliverable, error: fetchError } = await supabase
      .from("deliverables")
      .select("id, client_id, title, approval_status")
      .eq("id", id)
      .single();

    if (fetchError || !deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }
    if (deliverable.client_id !== client.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: updateError } = await supabase
      .from("deliverables")
      .update({
        approval_status,
        client_feedback: client_feedback || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: currentUser.id,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: sanitizeError(updateError) }, { status: 500 });
    }

    // Log activity
    await supabase.from("client_activity_log").insert({
      client_id: client.id,
      activity_type: "deliverable_event",
      title: `Deliverable ${approval_status === "approved" ? "approved" : "changes requested"}`,
      description: `"${deliverable.title}" was ${approval_status === "approved" ? "approved" : "sent back with feedback"} by the client.`,
      entity_type: "deliverable",
      entity_id: id,
    }).maybeSingle();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update deliverable" }, { status: 500 });
  }
}
