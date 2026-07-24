import { NextResponse } from "next/server";
import {
  getAuthenticatedClient,
  getCurrentUser,
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

    const portalClient = await getPortalClient(supabase, currentUser.id);
    if (!portalClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const doc = await queryOne<{ id: string; url: string; client_id: string }>(
      `UPDATE deliverables
       SET download_count = download_count + 1
       WHERE id = $1 AND visible_to_client = true AND (client_id = $2 OR $2 IS NULL)
       RETURNING id, url, client_id`,
      [id, portalClient.id],
    );

    if (!doc) {
      return NextResponse.json(
        { error: "Deliverable not found or not downloadable" },
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
