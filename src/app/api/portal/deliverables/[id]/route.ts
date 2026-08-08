import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { requirePortalClient } from "@/lib/portal-guard";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    // currentUser is used beyond the client guard (reviewed_by audit field),
    // so keep the explicit null check for type narrowing.
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const portal = await requirePortalClient(supabase, currentUser);
    if (portal.response) return portal.response;
    const client = portal.client;

    const { id } = await params;
    const body = await req.json();
    const { approval_status, client_feedback } = body;

    if (!approval_status || !["approved", "rejected"].includes(approval_status)) {
      return NextResponse.json({ error: "Invalid approval status" }, { status: 400 });
    }

    const { data: deliverable, error: fetchError } = await supabase
      .from("deliverables")
      .select("id, client_id, project_id, title, approval_status")
      .eq("id", id)
      .single();

    if (fetchError || !deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }
    // Owned via direct client_id OR via a project whose client is this client.
    let owned = deliverable.client_id === client.id;
    if (!owned && deliverable.project_id) {
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", deliverable.project_id)
        .eq("client_id", client.id)
        .maybeSingle();
      owned = !!project;
    }
    if (!owned) {
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

    // Send email notification to staff if enabled
    const prefs = client.notification_prefs as Record<string, boolean> | undefined;
    if (prefs?.email !== false && client.email) {
      try {
        const { NotificationEmail } = await import("@/emails/notification");
        const { sendEmail } = await import("@/lib/email");
        await sendEmail({
          to: client.email,
          subject: `Deliverable ${approval_status === "approved" ? "Approved" : "Changes Requested"}`,
          react: NotificationEmail({
            name: `Deliverable ${approval_status === "approved" ? "Approved" : "Changes Requested"}`,
            message: `"${deliverable.title}" was ${approval_status === "approved" ? "approved" : "sent back with feedback"} by the client.`,
          }),
        });
      } catch (emailErr) {
        console.error("[deliverables] email notification failed:", emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update deliverable" }, { status: 500 });
  }
}
