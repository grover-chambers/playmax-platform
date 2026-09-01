import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin, isStaff } from "@/lib/supabase/api";
import { getAdminClient } from "@/lib/supabase/admin";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Staging uploads are internal analytics data — staff only.
    if (!isStaff(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const db = getAdminClient();

    const { data, error } = await db
      .from("analytics_staging_uploads")
      .select(
        "*, branch:analytics_branches!branch_id(name), period:analytics_periods!period_id(label)",
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: sanitizeError(error) },
        { status: 500 },
      );
    }

    const uploads = (data ?? []).map((u) => ({
      ...u,
      branch_name: (u.branch as { name: string } | null)?.name ?? null,
      period_label: (u.period as { label: string } | null)?.label ?? null,
      branch: undefined,
      period: undefined,
    }));

    return NextResponse.json({ uploads });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch uploads" },
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
    if (!isAdmin(currentUser.role) && currentUser.role !== "data_handler" && currentUser.role !== "finance") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Data handler shares same DB via service role (bypasses is_admin-only RLS until 053 is pushed)
    const db = getAdminClient();

    const body = await request.json();
    const { filename, file_type, period_id, branch_id, branch_name, category_id, sub_category_id } = body;

    if (!filename || !file_type) {
      return NextResponse.json(
        { error: "filename and file_type are required" },
        { status: 400 },
      );
    }

    const validTypes = ["per_store_sales", "chain_wide_sales", "inventory", "sales_transactions", "stock_movements", "supplier_details", "pricing", "product_master", "supplier_products", "item_list_master", "per_supplier_sales", "supplier_item_allocations", "pending_grns"];
    if (!validTypes.includes(file_type)) {
      return NextResponse.json(
        { error: `file_type must be one of: ${validTypes.join(", ")}` },
        { status: 400 },
      );
    }

    // Server-side branch resolution: prefer an explicit branch_id; otherwise
    // resolve (or auto-create) a branch from the store name so new stores —
    // e.g. in a brand-new category — never need a hardcoded map.
    let resolvedBranchId: string | null = branch_id || null;
    if (!resolvedBranchId && branch_name && String(branch_name).trim()) {
      const storeName = String(branch_name).trim();
      const { data: found, error: findErr } = await db
        .from("analytics_branches")
        .select("id")
        .or(`name.ilike.%${storeName}%,code.ilike.%${storeName}%,city.ilike.%${storeName}%`)
        .limit(1)
        .maybeSingle();
      if (findErr) throw findErr;
      if (found) {
        resolvedBranchId = found.id;
      } else {
        const baseCode = storeName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 20) || "NEW_STORE";
        let code = baseCode;
        const { data: dup } = await db
          .from("analytics_branches")
          .select("code")
          .eq("code", code)
          .maybeSingle();
        if (dup) code = `${baseCode}_${Date.now().toString().slice(-4)}`;
        const { data: created, error: createErr } = await db
          .from("analytics_branches")
          .insert({ name: storeName, code, active: true })
          .select("id")
          .single();
        if (createErr) throw createErr;
        resolvedBranchId = created.id;
      }
    }

    const { data, error } = await db
      .from("analytics_staging_uploads")
      .insert({
        filename,
        file_type,
        period_id: period_id || null,
        branch_id: resolvedBranchId,
        category_id: category_id || null,
        sub_category_id: sub_category_id || null,
        status: "uploaded",
        uploaded_by: currentUser.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: sanitizeError(error) },
        { status: 500 },
      );
    }

    // Capture Grand Total data for branch summary (if provided)
    const { grand_total } = body;
    if (grand_total && data && data.branch_id && data.period_id) {
      const supplierName = body.supplier_name ?? null;
      const summaryFields = {
        upload_id: data.id,
        branch_id: data.branch_id,
        period_id: data.period_id,
        supplier_name: supplierName,
        total_quantity: grand_total.quantity ?? 0,
        total_weight_tonnes: grand_total.weight ?? 0,
        total_amount: grand_total.total ?? 0,
      };
      // Check for existing summary row (no UNIQUE constraint reliance)
      const { data: existingSummary } = await db
        .from("analytics_fact_branch_summary")
        .select("id")
        .eq("branch_id", data.branch_id)
        .eq("period_id", data.period_id)
        .eq("supplier_name", supplierName)
        .maybeSingle();
      if (existingSummary) {
        await db
          .from("analytics_fact_branch_summary")
          .update(summaryFields)
          .eq("id", existingSummary.id);
      } else {
        await db
          .from("analytics_fact_branch_summary")
          .insert(summaryFields);
      }
    }

    return NextResponse.json({ upload: data }, { status: 201 });
  } catch (err: unknown) {
    console.error("Upload API error:", err);
    return NextResponse.json(
      { error: "Failed to create upload" },
      { status: 500 },
    );
  }
}
