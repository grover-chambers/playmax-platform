import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { requirePortalClient } from "@/lib/portal-guard";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    const portal = await requirePortalClient(supabase, currentUser);
    if (portal.response) return portal.response;
    const client = portal.client;

    const { data: activityData, error: activityErr } = await supabase
      .from("client_activity_log")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (activityErr && activityErr.code !== "42P01") {
      return NextResponse.json({ error: sanitizeError(activityErr) }, { status: 500 });
    }

    const activity = (activityData || []) as Array<{
      id: string;
      activity_type: string;
      title: string;
      description: string | null;
      entity_type: string | null;
      entity_id: string | null;
      metadata: Record<string, unknown>;
      created_at: string;
    }>;

    return NextResponse.json({ activity });
  } catch {
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
