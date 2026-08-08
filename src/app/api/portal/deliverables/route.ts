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

    // Get all project IDs owned by this client — documents/deliverables are
    // often linked through project_id rather than a direct client_id column
    const { data: clientProjects } = await supabase
      .from("projects")
      .select("id")
      .eq("client_id", client.id);
    const projectIds = (clientProjects || []).map(p => p.id);

    // Match documents by direct client_id OR via a project this client owns
    const docFilter = projectIds.length > 0
      ? `client_id.eq.${client.id},project_id.in.(${projectIds.join(",")})`
      : `client_id.eq.${client.id}`;

    const { data: docs, error: docsErr } = await supabase
      .from("documents")
      .select("id, name, type, url, size, visible_to_client, created_at, project_id, projects(name)")
      .eq("visible_to_client", true)
      .or(docFilter)
      .order("created_at", { ascending: false });

    if (docsErr) return NextResponse.json({ error: sanitizeError(docsErr) }, { status: 500 });

    // Same for legacy deliverables table
    const delFilter = projectIds.length > 0
      ? `client_id.eq.${client.id},project_id.in.(${projectIds.join(",")})`
      : `client_id.eq.${client.id}`;

    const { data: dels } = await supabase
      .from("deliverables")
      .select("id, title, description, file_url, file_type, file_size, visible_to_client, created_at, project_id, pdf_base64, projects(name)")
      .eq("visible_to_client", true)
      .or(delFilter)
      .order("created_at", { ascending: false });

    // Merge and deduplicate
    const deliverables = [
      ...(docs || []).map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        url: d.url,
        size: d.size || 0,
        project: d.projects?.[0]?.name || null,
        created_at: d.created_at,
        source: "documents" as const,
        has_pdf: false,
      })),
      ...(dels || []).map(d => ({
        id: d.id,
        name: d.title,
        type: d.file_type || "other",
        url: d.file_url,
        size: Number(d.file_size) || 0,
        project: d.projects?.[0]?.name || null,
        created_at: d.created_at,
        source: "deliverables" as const,
        has_pdf: !!d.pdf_base64,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ deliverables });
  } catch {
    return NextResponse.json({ error: "Failed to fetch deliverables" }, { status: 500 });
  }
}
