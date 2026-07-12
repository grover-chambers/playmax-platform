import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

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
