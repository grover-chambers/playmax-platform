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

    // Fetch visible documents
    const { data: docs, error: docsErr } = await supabase
      .from("documents")
      .select("id, name, type, url, size, visible_to_client, created_at, project_id, projects(name)")
      .eq("client_id", client.id)
      .eq("visible_to_client", true)
      .order("created_at", { ascending: false });

    if (docsErr) return NextResponse.json({ error: sanitizeError(docsErr) }, { status: 500 });

    // Also fetch deliverables with visible_to_client
    const { data: dels } = await supabase
      .from("deliverables")
      .select("id, title, description, file_url, file_type, file_size, visible_to_client, created_at, project_id, pdf_base64, projects(name)")
      .eq("client_id", client.id)
      .eq("visible_to_client", true)
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
