import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("research_projects")
      .select("id, client_id, project_id, type, status, progress, value, due_date, survey_responses, metadata, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });

    const projects = data || [];

    const clientIds = projects.filter(p => p.client_id).map(p => p.client_id);
    let clientMap = new Map<string, string>();
    if (clientIds.length > 0) {
      const { data: clients } = await supabase
        .from("clients")
        .select("id, company")
        .in("id", clientIds);
      clientMap = new Map((clients || []).map(c => [c.id, c.company]));
    }

    const projectIds = projects.filter(p => p.project_id).map(p => p.project_id);
    let projectMap = new Map<string, string>();
    if (projectIds.length > 0) {
      const { data: projs } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", projectIds);
      projectMap = new Map((projs || []).map(p => [p.id, p.name]));
    }

    const enriched = projects.map(p => ({
      ...p,
      client_name: p.client_id ? clientMap.get(p.client_id) || null : null,
      project_name: p.project_id ? projectMap.get(p.project_id) || null : null,
    }));

    return NextResponse.json({ projects: enriched });
  } catch {
    return NextResponse.json({ error: "Failed to fetch research projects" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { client_id, project_id, type, title, value, due_date } = body;

    if (!type) {
      return NextResponse.json({ error: "type is required" }, { status: 400 });
    }

    const validTypes = ["market_research", "competitor_analysis", "consumer_survey", "brand_audit"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("research_projects")
      .select("id")
      .eq("client_id", client_id)
      .or(`project_id.eq.${project_id || "none"}`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "A research project for this client already exists" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("research_projects")
      .insert({
        client_id: client_id || null,
        project_id: project_id || null,
        type,
        status: "in_progress",
        progress: 0,
        value: value || 0,
        due_date: due_date || null,
        metadata: { title: title || "" },
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    return NextResponse.json({ project: data });
  } catch {
    return NextResponse.json({ error: "Failed to create research project" }, { status: 500 });
  }
}
