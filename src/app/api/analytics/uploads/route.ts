import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
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
    if (!isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { filename, file_type, period_id, branch_id, category_id } = body;

    if (!filename || !file_type) {
      return NextResponse.json(
        { error: "filename and file_type are required" },
        { status: 400 },
      );
    }

    const validTypes = ["per_store_sales", "chain_wide_sales", "inventory", "sales_transactions", "stock_movements", "supplier_details", "pricing", "product_master", "supplier_products"];
    if (!validTypes.includes(file_type)) {
      return NextResponse.json(
        { error: `file_type must be one of: ${validTypes.join(", ")}` },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("analytics_staging_uploads")
      .insert({
        filename,
        file_type,
        period_id: period_id || null,
        branch_id: branch_id || null,
        category_id: category_id || null,
        status: "uploaded",
        uploaded_by: currentUser.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: sanitizeError(error) },
        { status: 500 },
      );
    }

    // Capture Grand Total data for branch summary (if provided)
    const { grand_total } = body;
    if (grand_total && data && data.branch_id && data.period_id) {
      const { data: supplierMeta } = await supabase
        .from("analytics_staging_uploads")
        .select("metadata")
        .eq("id", data.id)
        .single();

      // Get supplier name from metadata or request body
      const supplierName = body.supplier_name ?? null;

      await supabase.from("analytics_fact_branch_summary").upsert(
        {
          upload_id: data.id,
          branch_id: data.branch_id,
          period_id: data.period_id,
          supplier_name: supplierName,
          total_quantity: grand_total.quantity ?? 0,
          total_weight_tonnes: grand_total.weight ?? 0,
          total_amount: grand_total.total ?? 0,
        },
        {
          onConflict: "branch_id,period_id,supplier_name",
          ignoreDuplicates: false,
        }
      );
    }

    return NextResponse.json({ upload: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create upload" },
      { status: 500 },
    );
  }
}
