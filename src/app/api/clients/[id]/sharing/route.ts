import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { forbidden, internalError, unauthorized } from "@/lib/errors";
import { syncClientScope } from "@/lib/analytics-scope";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return unauthorized();
    if (!isAdmin(currentUser.role)) return forbidden();

    const { id } = await params;

    const { data, error } = await supabase
      .from("portal_analytics_sharing")
      .select(
        "id, visible, period_id, branch_id, category_id, period:analytics_periods!period_id(label), branch:analytics_branches!branch_id(name), category:analytics_categories!category_id(name)",
      )
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) return internalError(error);

    const rows = (data ?? []).map((r) => ({
      id: r.id,
      visible: r.visible,
      period_id: r.period_id,
      branch_id: r.branch_id,
      category_id: r.category_id,
      period_label: (r.period as Array<{ label: string }> | null)?.[0]?.label ?? null,
      branch_name: (r.branch as Array<{ name: string }> | null)?.[0]?.name ?? null,
      category_name: (r.category as Array<{ name: string }> | null)?.[0]?.name ?? null,
      period: undefined,
      branch: undefined,
      category: undefined,
    }));

    return NextResponse.json({ rows });
  } catch {
    return internalError(new Error("Failed to fetch sharing records"));
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return unauthorized();
    if (!isAdmin(currentUser.role)) return forbidden();

    const { id } = await params;

    const { data: existing, error: existsErr } = await supabase
      .from("clients")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (existsErr) return internalError(existsErr);
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const result = await syncClientScope(id);

    return NextResponse.json({ success: true, ...result });
  } catch {
    return internalError(new Error("Failed to sync sharing scope"));
  }
}
