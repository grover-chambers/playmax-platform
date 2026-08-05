import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

/**
 * Delete a Cloudinary asset that belongs to a stored document.
 *
 * SECURITY: The request may NOT name an arbitrary public_id to destroy.
 * We always load the documents row FIRST (by id, falling back to a lookup
 * by the stored cloudinary_public_id), verify the caller is allowed to see
 * that row (staff, or the owning client), and only then destroy the EXACT
 * public_id persisted on that row.
 */
export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, public_id } = body;

    // Look up the document row through the caller's RLS-scoped client so we
    // inherit client-scoped policies, then verify ownership explicitly below.
    let docQuery = supabase
      .from("documents")
      .select("id, client_id, project_id, cloudinary_public_id, visible_to_client");
    if (id) {
      docQuery = docQuery.eq("id", id);
    } else if (public_id) {
      // Legacy callers pass public_id only — resolve it to a real row so the
      // destroy is still scoped to a known document asset.
      docQuery = docQuery.eq("cloudinary_public_id", public_id);
    } else {
      return NextResponse.json({ error: "document id is required" }, { status: 400 });
    }

    const { data: doc, error: docError } = await docQuery.maybeSingle();
    if (docError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Ownership check: staff may destroy any document asset; a client may
    // only destroy assets on documents they can read (their own client_id
    // or a project they own).
    if (!isAdmin(currentUser.role)) {
      const client = await getPortalClient(supabase, currentUser.id);
      if (!client) {
        return NextResponse.json({ error: "No client account linked" }, { status: 403 });
      }

      let owned = doc.client_id === client.id;
      if (!owned && doc.project_id) {
        const { data: project } = await supabase
          .from("projects")
          .select("id")
          .eq("id", doc.project_id)
          .eq("client_id", client.id)
          .maybeSingle();
        owned = !!project;
      }
      if (!owned) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const storedPublicId = doc.cloudinary_public_id as string | null;
    // Nothing stored in Cloudinary for this document — nothing to destroy.
    if (!storedPublicId) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      return NextResponse.json({ error: "Cloudinary cloud name not configured" }, { status: 500 });
    }

    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (apiKey && apiSecret) {
      const timestamp = Math.round(Date.now() / 1000);
      const signature = crypto.createHash("sha256")
        .update(`public_id=${storedPublicId}&timestamp=${timestamp}${apiSecret}`)
        .digest("hex");

      const formData = new URLSearchParams();
      formData.append("public_id", storedPublicId);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
        { method: "POST", body: formData },
      );

      if (!res.ok) {
        return NextResponse.json({ error: "Failed to delete from Cloudinary" }, { status: 502 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
