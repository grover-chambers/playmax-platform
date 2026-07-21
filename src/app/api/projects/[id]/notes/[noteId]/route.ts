import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";
import type { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  try {
    const { id, noteId } = await params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(currentUser.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { x, y, content, color } = body;

    const updateData: Record<string, unknown> = {};
    if (x !== undefined) updateData.x = x;
    if (y !== undefined) updateData.y = y;
    if (content !== undefined) updateData.content = content;
    if (color !== undefined) updateData.color = color;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { error } = await supabase
      .from("project_notes")
      .update(updateData)
      .eq("id", noteId)
      .eq("project_id", id);

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  try {
    const { id, noteId } = await params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(currentUser.role as UserRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("project_notes")
      .delete()
      .eq("id", noteId)
      .eq("project_id", id);

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
