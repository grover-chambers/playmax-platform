import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("tasks")
      .select("*, projects(name)")
      .order("due_date", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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
    const body = await request.json();
    const { name, project_id, assignee_id, due_date, status, priority } = body;

    if (!name || !project_id) {
      return NextResponse.json(
        { error: "Name and project are required" },
        { status: 400 },
      );
    }

    const supabase = getSupabase();
    const { error } = await supabase.from("tasks").insert({
      name,
      project_id,
      assignee_id,
      due_date,
      status: status || "todo",
      priority: priority || "medium",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, assignee_id, due_date, priority, name } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 },
      );
    }

    const updateData: Record<string, string> = {};
    if (status) updateData.status = status;
    if (assignee_id) updateData.assignee_id = assignee_id;
    if (due_date) updateData.due_date = due_date;
    if (priority) updateData.priority = priority;
    if (name) updateData.name = name;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
