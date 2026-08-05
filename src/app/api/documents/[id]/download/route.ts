import { NextResponse } from "next/server";
import {
  getAuthenticatedClient,
  getCurrentUser,
  isAdmin,
} from "@/lib/supabase/api";
import { queryOne } from "@/lib/db";
import { getPortalClient } from "@/lib/portal";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Raw pg runs as the DB owner, so RLS does NOT apply to the increment
    // below. Verify the caller can actually see the document before touching
    // the row: staff may see any visible document; clients may only see
    // documents owned by their client record or by a project they own.
    if (!isAdmin(currentUser.role)) {
      const portalClient = await getPortalClient(supabase, currentUser.id);
      if (!portalClient) {
        return NextResponse.json(
          { error: "Client account not found" },
          { status: 403 },
        );
      }

      const { data: clientProjects } = await supabase
        .from("projects")
        .select("id")
        .eq("client_id", portalClient.id);
      const projectIds = (clientProjects || []).map((p) => p.id);

      const doc = await queryOne<{ id: string; url: string }>(
        `UPDATE documents SET download_count = download_count + 1
         WHERE id = $1 AND visible_to_client = true
           AND (client_id = $2 OR ($3::uuid[] IS NOT NULL AND project_id = ANY($3)))
         RETURNING id, url`,
        [id, portalClient.id, projectIds.length > 0 ? projectIds : null],
      );

      if (!doc) {
        return NextResponse.json(
          { error: "Document not found or not downloadable" },
          { status: 404 },
        );
      }

      return NextResponse.json({ url: doc.url });
    }

    // Staff: any document visible to clients may be downloaded/tracked.
    const doc = await queryOne<{ id: string; url: string }>(
      `UPDATE documents SET download_count = download_count + 1
       WHERE id = $1 AND visible_to_client = true
       RETURNING id, url`,
      [id],
    );

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found or not downloadable" },
        { status: 404 },
      );
    }

    return NextResponse.json({ url: doc.url });
  } catch {
    return NextResponse.json(
      { error: "Failed to track download" },
      { status: 500 },
    );
  }
}
