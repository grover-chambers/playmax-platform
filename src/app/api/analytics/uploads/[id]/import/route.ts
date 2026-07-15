import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get upload details
    const { data: upload, error: uploadError } = await supabase
      .from("analytics_staging_uploads")
      .select("*")
      .eq("id", id)
      .single();

    if (uploadError || !upload) {
      return NextResponse.json(
        { error: "Upload not found" },
        { status: 404 },
      );
    }

    if (!upload.period_id) {
      return NextResponse.json(
        { error: "Upload has no period assigned. Set period_id first." },
        { status: 400 },
      );
    }

    // Get staging rows — only import rows with a stock_code
    const { data: allRows, error: rowsError } = await supabase
      .from("analytics_staging_rows")
      .select("*")
      .eq("upload_id", id)
      .not("stock_code", "is", null)
      .not("stock_code", "eq", "")
      .order("row_number");

    // Also get count of skipped rows for the summary
    const { data: allStagingRows } = await supabase
      .from("analytics_staging_rows")
      .select("row_number, stock_code")
      .eq("upload_id", id)
      .order("row_number");

    if (rowsError) {
      return NextResponse.json(
        { error: sanitizeError(rowsError) },
        { status: 500 },
      );
    }

    const rows = allRows ?? [];
    const totalStagingRows = allStagingRows?.length ?? 0;
    const skippedDueToMissing = totalStagingRows - rows.length;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No valid staging rows to import (all rows are missing stock_code)" },
        { status: 400 },
      );
    }

    const imported: number[] = [];
    const skipped: number[] = [];
    const errors: string[] = [];

    // For per_store_sales and chain_wide_sales → insert into analytics_fact_sales
    if (upload.file_type === "per_store_sales" || upload.file_type === "chain_wide_sales") {
      const branchId = upload.branch_id;

      for (const row of rows) {
        try {
          if (!row.stock_code) {
            skipped.push(row.row_number);
            continue;
          }

          // Find or create product
          let productId: string | null = null;

          const { data: existing } = await supabase
            .from("analytics_products")
            .select("id, category_id")
            .eq("stock_code", row.stock_code)
            .maybeSingle();

          if (existing) {
            productId = existing.id;
          } else if (row.product_name) {
            const { data: newProduct } = await supabase
              .from("analytics_products")
              .insert({
                stock_code: row.stock_code,
                name: row.product_name,
                sub_category: row.sub_category ?? null,
              })
              .select()
              .single();

            if (newProduct) productId = newProduct.id;
          }

          if (!productId) {
            errors.push(`Row ${row.row_number}: unknown stock_code "${row.stock_code}"`);
            continue;
          }

          const totalAmount =
            typeof row.total_amount === "number"
              ? row.total_amount
              : typeof row.quantity === "number" && typeof row.unit_price === "number"
                ? row.quantity * row.unit_price
                : 0;

          await supabase.from("analytics_fact_sales").upsert(
            {
              period_id: upload.period_id,
              branch_id: branchId || "00000000-0000-0000-0000-000000000000",
              category_id: upload.category_id,
              product_id: productId,
              quantity: row.quantity ?? 0,
              weight_tonnes: row.weight_tonnes ?? 0,
              unit_price: row.unit_price ?? null,
              total_amount: totalAmount,
              cost_amount: row.unit_cost ? row.quantity * row.unit_cost : 0,
            },
            {
              onConflict: "period_id,branch_id,product_id",
              ignoreDuplicates: false,
            },
          );

          imported.push(row.row_number);
        } catch {
          errors.push(`Row ${row.row_number}: unexpected error`);
        }
      }
    }

    // For inventory → insert into analytics_fact_inventory
    if (upload.file_type === "inventory") {
      for (const row of rows) {
        try {
          if (!row.stock_code) {
            skipped.push(row.row_number);
            continue;
          }

          const { data: existing } = await supabase
            .from("analytics_products")
            .select("id")
            .eq("stock_code", row.stock_code)
            .maybeSingle();

          if (!existing) {
            errors.push(`Row ${row.row_number}: unknown stock_code "${row.stock_code}"`);
            continue;
          }

          await supabase.from("analytics_fact_inventory").upsert(
            {
              snapshot_date: new Date().toISOString().split("T")[0],
              product_id: existing.id,
              branch_id: upload.branch_id || null,
              quantity_on_hand: row.quantity ?? 0,
              unit_cost: row.unit_cost ?? null,
            },
            {
              onConflict: "snapshot_date,product_id,branch_id",
              ignoreDuplicates: false,
            },
          );

          imported.push(row.row_number);
        } catch {
          errors.push(`Row ${row.row_number}: unexpected error`);
        }
      }
    }

    const status = errors.length === 0 ? "imported" : errors.length < rows.length ? "imported" : "failed";

    await supabase
      .from("analytics_staging_uploads")
      .update({
        status,
        total_rows: totalStagingRows,
        error_rows: errors.length + skippedDueToMissing,
      })
      .eq("id", id);

    return NextResponse.json({
      imported: imported.length,
      skipped: skipped.length + skippedDueToMissing,
      errors,
      status,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to import data" },
      { status: 500 },
    );
  }
}
