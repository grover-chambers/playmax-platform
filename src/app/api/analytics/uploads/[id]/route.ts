import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin, isStaff } from "@/lib/supabase/api";
import { getAdminClient } from "@/lib/supabase/admin";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = getAdminClient();
    // Staging uploads (incl. raw rows) are internal — staff only.
    if (!currentUser.role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: upload, error: uploadError } = await db
      .from("analytics_staging_uploads")
      .select(
        "*, branch:analytics_branches!branch_id(name), period:analytics_periods!period_id(label)",
      )
      .eq("id", id)
      .single();

    if (uploadError || !upload) {
      return NextResponse.json(
        { error: "Upload not found" },
        { status: 404 },
      );
    }

    const { data: rows, error: rowsError } = await db
      .from("analytics_staging_rows")
      .select("*")
      .eq("upload_id", id)
      .order("row_number");

    if (rowsError) {
      return NextResponse.json(
        { error: sanitizeError(rowsError) },
        { status: 500 },
      );
    }

    const branchName = (upload as { branch?: { name: string | null } }).branch?.name ?? null;
    const periodLabel = (upload as { period?: { label: string | null } }).period?.label ?? null;

    return NextResponse.json({
      upload: {
        ...upload,
        branch_name: branchName,
        period_label: periodLabel,
        branch: undefined,
        period: undefined,
      },
      rows: rows ?? [],
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch upload" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = getAdminClient();
    if (!currentUser.role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) updates.status = body.status;
    if (body.total_rows !== undefined) updates.total_rows = body.total_rows;
    if (body.error_rows !== undefined) updates.error_rows = body.error_rows;
    if (body.metadata !== undefined) updates.metadata = body.metadata;
    if (body.period_id !== undefined) updates.period_id = body.period_id;
    if (body.branch_id !== undefined) updates.branch_id = body.branch_id;
    if (body.category_id !== undefined) updates.category_id = body.category_id;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const { data, error } = await db
      .from("analytics_staging_uploads")
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

    return NextResponse.json({ upload: data });
  } catch {
    return NextResponse.json(
      { error: "Failed to update upload" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = getAdminClient();
    if (!currentUser.role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db
      .from("analytics_staging_rows")
      .delete()
      .eq("upload_id", id);

    const { error } = await db
      .from("analytics_staging_uploads")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: sanitizeError(error) },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete upload" },
      { status: 500 },
    );
  }
}
