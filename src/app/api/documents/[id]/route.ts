import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";
import crypto from "node:crypto";

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

    // Load the row first so we destroy the EXACT asset stored on it, never
    // an attacker-supplied public_id.
    const { data: doc, error: fetchError } = await supabase
      .from("documents")
      .select("cloudinary_public_id")
      .eq("id", id)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });

    // Best-effort cleanup of the Cloudinary asset owned by this document.
    // Failure to destroy the asset should not fail the DB delete, but the
    // asset must be derived from the stored row.
    const storedPublicId = doc.cloudinary_public_id as string | null;
    if (storedPublicId) {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (cloudName && apiKey && apiSecret) {
        const timestamp = Math.round(Date.now() / 1000);
        const signature = crypto
          .createHash("sha256")
          .update(`public_id=${storedPublicId}&timestamp=${timestamp}${apiSecret}`)
          .digest("hex");

        const formData = new URLSearchParams();
        formData.append("public_id", storedPublicId);
        formData.append("api_key", apiKey);
        formData.append("timestamp", String(timestamp));
        formData.append("signature", signature);

        await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
          { method: "POST", body: formData },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
