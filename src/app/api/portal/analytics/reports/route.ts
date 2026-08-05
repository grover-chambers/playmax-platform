import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";
import { internalError, notFound, unauthorized } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return unauthorized();

    const client = await getPortalClient(supabase, currentUser.id);
    if (!client) return notFound("No client account linked");

    // Fetch published reports for this client
    const { data: reports, error } = await supabase
      .from("analytics_saved_reports")
      .select("id, name, report_type, config, generated_data, visible_to_client, created_at, updated_at")
      .eq("client_id", client.id)
      .eq("visible_to_client", true)
      .order("updated_at", { ascending: false });

    if (error) {
      return internalError(error);
    }

    return NextResponse.json({ reports: reports || [] });
  } catch {
    return internalError(new Error("Failed to fetch reports"));
  }
}
