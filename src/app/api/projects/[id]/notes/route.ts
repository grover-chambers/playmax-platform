import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";
import { sanitizeError } from "@/lib/errors";
import type { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

async function checkAccess(supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>, currentUser: { id: string; role: string }, projectId: string) {
  if (isAdmin(currentUser.role as UserRole)) return true;
  const client = await getPortalClient(supabase, currentUser.id);
  if (!client) return false;

  const { data: member } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (member) return true;

  const { data: project } = await supabase
    .from("projects")
    .select("client_id")
    .eq("id", projectId)
    .maybeSingle();

  return project?.client_id === client.id;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await checkAccess(supabase, currentUser, id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("project_notes")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ notes: data || [] });
  } catch {
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await checkAccess(supabase, currentUser, id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { x, y, content, color, author_name } = body;

    if (content === undefined || content === null) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("project_notes")
      .select("sort_order")
      .eq("project_id", id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (existing?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("project_notes")
      .insert({
        project_id: id,
        x: x || 0,
        y: y || 0,
        content,
        color: color || "#ffffff",
        author_name: author_name || currentUser.email || "Unknown",
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ note: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
