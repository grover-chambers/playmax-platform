import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const ALLOWED_PATCH_FIELDS = new Set([
  "name", "type", "url", "cloudinary_public_id", "size",
  "visible_to_client", "project_id", "client_id",
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (ALLOWED_PATCH_FIELDS.has(key)) {
        updates[key] = body[key];
      }
    }

    const { data, error } = await supabase
      .from("documents")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
