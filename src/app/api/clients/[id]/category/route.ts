import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { forbidden, internalError, unauthorized } from "@/lib/errors";
import { syncClientScope } from "@/lib/analytics-scope";

export const dynamic = "force-dynamic";

export async function PATCH(
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
    const nextCategoryId = category_id ? String(category_id) : null;

    const { data: existing, error: existsErr } = await supabase
      .from("clients")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (existsErr) return internalError(existsErr);
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (nextCategoryId) {
      const { data: cat, error: catErr } = await supabase
        .from("analytics_categories")
        .select("id")
        .eq("id", nextCategoryId)
        .maybeSingle();
      if (catErr) return internalError(catErr);
      if (!cat) {
        return NextResponse.json({ error: "Category not found" }, { status: 400 });
      }
    }

    const { error: updateErr } = await supabase
      .from("clients")
      .update({ category_id: nextCategoryId })
      .eq("id", id);
    if (updateErr) return internalError(updateErr);

    if (nextCategoryId) {
      const { error: upsertErr } = await supabase
        .from("client_categories")
        .upsert(
          { client_id: id, category_id: nextCategoryId, is_primary: true, created_by: currentUser.id },
          { onConflict: "client_id,category_id" },
        );
      if (upsertErr) return internalError(upsertErr);
      const { error: unsetErr } = await supabase
        .from("client_categories")
        .update({ is_primary: false })
        .eq("client_id", id)
        .neq("category_id", nextCategoryId);
      if (unsetErr) return internalError(unsetErr);
    }

    try {
      await syncClientScope(id);
    } catch (scopeErr) {
      console.error("Failed to sync client scope:", scopeErr);
    }

    return NextResponse.json({ success: true, category_id: nextCategoryId });
  } catch {
    return internalError(new Error("Failed to update client category"));
  }
}
