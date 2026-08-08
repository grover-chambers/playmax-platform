import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { requirePortalClient } from "@/lib/portal-guard";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    const portal = await requirePortalClient(supabase, currentUser);
    if (portal.response) return portal.response;
    const client = portal.client;

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    let query = supabase
      .from("project_milestones")
      .select("id, project_id, title, description, due_date, status, sort_order, completed_at, created_at")
      .eq("client_id", client.id)
      .order("sort_order", { ascending: true });

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ milestones: [] });
      }
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ milestones: data || [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch milestones" }, { status: 500 });
  }
}
