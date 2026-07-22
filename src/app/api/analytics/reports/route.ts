import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("analytics_saved_reports")
      .select("*, client:clients(id, name, company)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: sanitizeError(error) },
        { status: 500 },
      );
    }

    return NextResponse.json({ reports: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, report_type, config, client_id, visible_to_client, generated_data } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("analytics_saved_reports")
      .insert({
        name,
        report_type: report_type || "market_share",
        config: config || {},
        client_id: client_id || null,
        visible_to_client: visible_to_client ?? false,
        generated_data: generated_data || {},
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: sanitizeError(error) },
        { status: 500 },
      );
    }

    // Auto-link to research projects by client_id
    if (data && client_id) {
      const { data: researchProjects } = await supabase
        .from("research_projects")
        .select("id, project_id")
        .eq("client_id", client_id);

      if (researchProjects && researchProjects.length > 0) {
        const links = researchProjects
          .filter((rp) => rp.project_id)
          .map((rp) => ({
            project_id: rp.project_id,
            report_id: data.id,
            linked_by: currentUser.id,
          }));

        if (links.length > 0) {
          await supabase.from("project_analytics_reports").upsert(links, {
            onConflict: "project_id, report_id",
            ignoreDuplicates: true,
          });
        }
      }
    }

    return NextResponse.json({ report: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to save report" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, client_id, visible_to_client, generated_data, name } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (client_id !== undefined) updates.client_id = client_id;
    if (visible_to_client !== undefined) updates.visible_to_client = visible_to_client;
    if (generated_data !== undefined) updates.generated_data = generated_data;
    if (name !== undefined) updates.name = name;

    const { data, error } = await supabase
      .from("analytics_saved_reports")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: sanitizeError(error) },
        { status: 500 },
      );
    }

    return NextResponse.json({ report: data });
  } catch {
    return NextResponse.json(
      { error: "Failed to update report" },
      { status: 500 },
    );
  }
}
