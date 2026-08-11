import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { forbidden, internalError, unauthorized } from "@/lib/errors";
import { syncClientScope } from "@/lib/analytics-scope";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return unauthorized();
    if (!isAdmin(currentUser.role)) return forbidden();

    const { id } = await params;
    const { category_id } = await request.json();
    if (!category_id) {
      return NextResponse.json({ error: "category_id is required" }, { status: 400 });
    }

    const { data: cat, error: catErr } = await supabase
      .from("analytics_categories")
      .select("id")
      .eq("id", category_id)
      .maybeSingle();
    if (catErr) return internalError(catErr);
    if (!cat) {
      return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }

    const { data: existingPrimary, error: primErr } = await supabase
      .from("client_categories")
      .select("id")
      .eq("client_id", id)
      .eq("is_primary", true)
      .maybeSingle();
    if (primErr) return internalError(primErr);

    const { error: insErr } = await supabase
      .from("client_categories")
      .upsert(
        {
          client_id: id,
          category_id: category_id,
          is_primary: !existingPrimary,
          created_by: currentUser.id,
        },
        { onConflict: "client_id,category_id" },
      );
    if (insErr) return internalError(insErr);

    if (!existingPrimary) {
      const { error: clientErr } = await supabase
        .from("clients")
        .update({ category_id })
        .eq("id", id);
      if (clientErr) return internalError(clientErr);
    }

    try {
      await syncClientScope(id);
    } catch (scopeErr) {
      console.error("Failed to sync client scope:", scopeErr);
    }

    return NextResponse.json({ success: true });
  } catch {
    return internalError(new Error("Failed to add client category"));
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return unauthorized();
    if (!isAdmin(currentUser.role)) return forbidden();

    const { id } = await params;
    const { category_id } = await request.json();
    if (!category_id) {
      return NextResponse.json({ error: "category_id is required" }, { status: 400 });
    }

    const { data: row, error: getErr } = await supabase
      .from("client_categories")
      .select("is_primary")
      .eq("client_id", id)
      .eq("category_id", category_id)
      .maybeSingle();
    if (getErr) return internalError(getErr);
    if (!row) {
      return NextResponse.json({ error: "Category not assigned to this client" }, { status: 404 });
    }

    const { error: delErr } = await supabase
      .from("client_categories")
      .delete()
      .eq("client_id", id)
      .eq("category_id", category_id);
    if (delErr) return internalError(delErr);

    if (row.is_primary) {
      const { data: next, error: nextErr } = await supabase
        .from("client_categories")
        .select("category_id")
        .eq("client_id", id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (nextErr) return internalError(nextErr);
      const { error: clientErr } = await supabase
        .from("clients")
        .update({ category_id: next?.category_id ?? null })
        .eq("id", id);
      if (clientErr) return internalError(clientErr);
      if (next?.category_id) {
        const { error: promoteErr } = await supabase
          .from("client_categories")
          .update({ is_primary: true })
          .eq("client_id", id)
          .eq("category_id", next.category_id);
        if (promoteErr) return internalError(promoteErr);
      }
    }

    try {
      await syncClientScope(id);
    } catch (scopeErr) {
      console.error("Failed to sync client scope:", scopeErr);
    }

    return NextResponse.json({ success: true });
  } catch {
    return internalError(new Error("Failed to remove client category"));
  }
}
