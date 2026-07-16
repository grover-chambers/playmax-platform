import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getPortalClient(supabase, currentUser.id);
    if (!client) return NextResponse.json({ error: "No client account linked" }, { status: 404 });

    const { data, error } = await supabase
      .from("projects")
      .select("id, name, type, status, value, progress, start_date, end_date, brief, created_at")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    return NextResponse.json({ projects: data || [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}
