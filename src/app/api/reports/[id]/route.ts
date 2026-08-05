import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin, isStaff } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";
import { getPortalClient } from "@/lib/portal";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const { data, error } = await supabase
      .from("reports")
      .select("*, metrics:report_metrics(*)")
      .eq("id", id)
      .single();

    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!isStaff(currentUser.role)) {
      // Clients may only read reports that are published AND belong to
      // their own client record — otherwise a client could fetch another
      // client's published report by guessing ids.
      if (!data.visible_to_client) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const portalClient = await getPortalClient(supabase, currentUser.id);
      if (!portalClient) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (data.client_id && data.client_id !== portalClient.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdmin(currentUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.type !== undefined) updates.type = body.type;
    if (body.content !== undefined) updates.content = body.content;
    if (body.visible_to_client !== undefined) updates.visible_to_client = body.visible_to_client;

    const { data, error } = await supabase
      .from("reports")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });

    if (body.metrics !== undefined) {
      await supabase.from("report_metrics").delete().eq("report_id", id);

      if (body.metrics.length > 0) {
        const { error: me } = await supabase.from("report_metrics").insert(
          body.metrics.map((m: Record<string, unknown>) => ({ ...m, report_id: id }))
        );
        if (me) return NextResponse.json({ error: sanitizeError(me) }, { status: 500 });
      }
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdmin(currentUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    await supabase.from("report_metrics").delete().eq("report_id", id);

    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }
}
