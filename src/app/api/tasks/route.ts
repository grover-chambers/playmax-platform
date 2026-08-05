import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin, isStaff } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Tasks reference internal projects/staff — staff route only.
    if (!isStaff(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let query = supabase
      .from("tasks")
      .select("*, projects(name)")
      .order("due_date", { ascending: true });

    if (currentUser.role === "crm_staff") {
      query = query.eq("assigned_to", currentUser.id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
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
    const { title, project_id, assigned_to, due_date, status, priority } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("tasks").insert({
      title,
      project_id: project_id || null,
      assigned_to: assigned_to || currentUser.id,
      due_date,
      status: status || "todo",
      priority: priority || "medium",
    });

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, assigned_to, due_date, priority, title } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 },
      );
    }

    const updateData: Record<string, string> = {};
    if (status) updateData.status = status;
    if (assigned_to && isAdmin(currentUser.role)) updateData.assigned_to = assigned_to;
    if (due_date) updateData.due_date = due_date;
    if (priority) updateData.priority = priority;
    if (title) updateData.title = title;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    let query = supabase.from("tasks").update(updateData);

    if (currentUser.role === "crm_staff") {
      query = query.eq("assigned_to", currentUser.id);
    }

    const { error } = await query.eq("id", id);

    if (error) {
      return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
