import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin, isStaff } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const clientId = searchParams.get("client_id");

    let query = supabase
      .from("documents")
      .select("*, uploaded_by_email:auth.users(email)")
      .order("created_at", { ascending: false });

    if (projectId) query = query.eq("project_id", projectId);
    if (clientId) query = query.eq("client_id", clientId);

    if (currentUser.role === "crm_staff") {
      query = query.in("project_id", (await supabase.from("projects").select("id").eq("assigned_to", currentUser.id)).data?.map(p => p.id) || []);
    } else if (!isAdmin(currentUser.role)) {
      // Portal clients see only their own documents — never trust a
      // client-supplied project_id/client_id filter to scope the query.
      const client = await getPortalClient(supabase, currentUser.id);
      if (!client) {
        return NextResponse.json({ data: [] });
      }
      const { data: clientProjects } = await supabase
        .from("projects")
        .select("id")
        .eq("client_id", client.id);
      const projectIds = (clientProjects || []).map((p) => p.id);

      query = query.in("client_id", [client.id]);
      if (projectIds.length > 0) {
        query = query.or(`project_id.in.(${projectIds.join(",")}),project_id.is.null`);
      } else {
        query = query.is("project_id", null);
      }
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { project_id, client_id, name, type, url, cloudinary_public_id, size, visible_to_client } = body;

    if (!project_id || !name || !url) {
      return NextResponse.json({ error: "project_id, name, and url are required" }, { status: 400 });
    }

    // Non-staff (portal clients) may only attach documents to their own
    // client's projects — otherwise a client could write into another
    // client's project by supplying an arbitrary project_id.
    if (!isStaff(currentUser.role)) {
      const client = await getPortalClient(supabase, currentUser.id);
      if (!client) {
        return NextResponse.json({ error: "Client account not found" }, { status: 403 });
      }
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", project_id)
        .eq("client_id", client.id)
        .maybeSingle();
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }

    const { data, error } = await supabase
      .from("documents")
      .insert({
        project_id,
        client_id,
        name,
        type: type || "other",
        url,
        cloudinary_public_id,
        size: size || 0,
        visible_to_client: visible_to_client || false,
        uploaded_by: currentUser.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
