import { NextResponse } from "next/server";
import {
  getAuthenticatedClient,
  getCurrentUser,
} from "@/lib/supabase/api";
import { queryOne } from "@/lib/db";

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

    const doc = await queryOne<{ id: string; url: string; visible_to_client: boolean }>(
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
