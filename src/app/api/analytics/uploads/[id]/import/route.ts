import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

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

          // Resolve category + subcategory from product
          let salesCategoryId = upload.category_id;
          let salesSubCategoryId: string | null = null;
          if (!salesCategoryId && productId) {
            const { data: prodInfo } = await supabase
              .from("analytics_products")
              .select("category_id, sub_category_id")
              .eq("id", productId)
              .single();
            if (prodInfo) {
              salesCategoryId = prodInfo.category_id || salesCategoryId;
              salesSubCategoryId = prodInfo.sub_category_id || null;
            }
          }

          const { error: salesErr } = await supabase.from("analytics_fact_sales").upsert(
            {
              period_id: upload.period_id,
              branch_id: branchId || "00000000-0000-0000-0000-000000000000",
              category_id: salesCategoryId,
              sub_category_id: salesSubCategoryId,
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
          if (salesErr) {
            errors.push("Row " + row.row_number + ": sales upsert failed: " + salesErr.message);
            continue;
          }

          // Also populate pricing fact table (per_store_sales only)
          if (upload.file_type === "per_store_sales" && (row.unit_cost || row.unit_price || row.weight_tonnes)) {
            const { error: pricingErr } = await supabase.from("analytics_fact_pricing").upsert(
              {
                period_id: upload.period_id,
                product_id: productId,
                branch_id: branchId || null,
                category_id: salesCategoryId,
                sub_category_id: salesSubCategoryId,
                standard_cost: row.unit_cost ?? null,
                selling_price: row.unit_price ?? null,
                weight_tonnes: row.weight_tonnes ?? null,
              },
              {
                onConflict: "period_id,product_id,branch_id",
                ignoreDuplicates: false,
              },
            );
            if (pricingErr) {
              errors.push("Row " + row.row_number + ": pricing upsert failed: " + pricingErr.message);
              continue;
            }
          }

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
          // Auto-create product if needed
          let productId: string | null = null;
          if (row.stock_code) {
            const { data: existing } = await supabase
              .from("analytics_products")
              .select("id")
              .eq("stock_code", row.stock_code)
              .single();
            if (existing) {
              productId = existing.id;
            } else {
              const { data: newProd } = await supabase
                .from("analytics_products")
                .insert({ stock_code: row.stock_code, name: row.product_name || row.stock_code })
                .select("id")
                .single();
              productId = newProd?.id ?? null;
            }
          }
          if (!productId) { skipped.push(row.row_number); continue; }

          // Resolve category from product
          let invCategoryId: string | null = null;
          let invSubCategoryId: string | null = null;
          if (productId) {
            const { data: prodCat } = await supabase
              .from("analytics_products")
              .select("category_id, sub_category_id")
              .eq("id", productId)
              .single();
            if (prodCat) {
              invCategoryId = prodCat.category_id || null;
              invSubCategoryId = prodCat.sub_category_id || null;
            }
          }

          const { error: invErr } = await supabase.from("analytics_fact_inventory").upsert(
            {
              snapshot_date: new Date().toISOString().split("T")[0],
              product_id: productId,
              branch_id: upload.branch_id,
              supplier_id: upload.supplier_id || null,
              category_id: invCategoryId,
              sub_category_id: invSubCategoryId,
              quantity_on_hand: row.quantity ?? 0,
              unit_cost: row.unit_cost ? parseFloat(String(row.unit_cost).replace(/[^\d.-]/g, "")) : null,
            },
            { onConflict: "snapshot_date,product_id,branch_id" }
          );
          if (invErr) {
            errors.push("Row " + row.row_number + ": inventory upsert failed: " + invErr.message);
            continue;
          }
          imported.push(row.row_number);
        } catch (e) {
          errors.push(`Row ${row.row_number}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    }

    // For product_master → upsert into analytics_products + auto-create categories
    if (upload.file_type === "product_master") {
      for (const row of rows) {
        try {
          if (!row.stock_code) { skipped.push(row.row_number); continue; }

          // Auto-create category if provided
          let categoryId: string | null = null;
          const categoryName = row.category_name || row.sub_category;
          if (categoryName) {
            const { data: existingCat } = await supabase
              .from("analytics_categories")
              .select("id")
              .ilike("name", categoryName.trim())
              .single();
            if (existingCat) {
              categoryId = existingCat.id;
            } else {
              const { data: newCat } = await supabase
                .from("analytics_categories")
                .insert({ name: categoryName.trim().toUpperCase() })
                .select("id")
                .single();
              categoryId = newCat?.id ?? null;
            }
          }

          // Auto-create subcategory if provided and category exists
          let subCategoryId: string | null = null;
          const subCatName = row.sub_category_name || row.sub_category;
          if (subCatName && categoryId) {
            const { data: existingSub } = await supabase
              .from("analytics_subcategories")
              .select("id")
              .eq("category_id", categoryId)
              .ilike("name", subCatName.trim())
              .single();
            if (existingSub) {
              subCategoryId = existingSub.id;
            } else {
              const { data: newSub } = await supabase
                .from("analytics_subcategories")
                .insert({ category_id: categoryId, name: subCatName.trim().toUpperCase() })
                .select("id")
                .single();
              subCategoryId = newSub?.id ?? null;
            }
          }

          // Upsert product
          const { error: prodErr } = await supabase.from("analytics_products").upsert(
            {
              stock_code: row.stock_code,
              name: row.product_name || row.stock_code,
              category_id: categoryId,
              sub_category_id: subCategoryId,
              sub_category: row.sub_category || null,
              pack_size: row.pack_size || null,
            },
            { onConflict: "stock_code" }
          );
          if (prodErr) {
            errors.push("Row " + row.row_number + ": product upsert failed: " + prodErr.message);
            continue;
          }
          imported.push(row.row_number);
        } catch (e) {
          errors.push(`Row ${row.row_number}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    }

    // For supplier_products → create supplier + junction links
    if (upload.file_type === "supplier_products") {
      for (const row of rows) {
        try {
          if (!row.stock_code || !row.supplier_name) { skipped.push(row.row_number); continue; }

          // Auto-create supplier if doesn't exist
          let supplierId: string | null = null;
          const { data: existingSup } = await supabase
            .from("analytics_suppliers")
            .select("id")
            .ilike("name", row.supplier_name.trim())
            .single();
          if (existingSup) {
            supplierId = existingSup.id;
          } else {
            const { data: newSup } = await supabase
              .from("analytics_suppliers")
              .insert({
                name: row.supplier_name.trim(),
                code: row.supplier_code || null,
              })
              .select("id")
              .single();
            supplierId = newSup?.id ?? null;
          }
          if (!supplierId) { skipped.push(row.row_number); continue; }

          // Find or create product
          let productId: string | null = null;
          const { data: existingProd } = await supabase
            .from("analytics_products")
            .select("id")
            .eq("stock_code", row.stock_code)
            .single();
          if (existingProd) {
            productId = existingProd.id;
          } else {
            // Auto-create category if provided
            let categoryId: string | null = null;
            if (row.category_name) {
              const { data: cat } = await supabase
                .from("analytics_categories")
                .select("id")
                .ilike("name", row.category_name.trim())
                .single();
              if (cat) {
                categoryId = cat.id;
              } else {
                const { data: newCat } = await supabase
                  .from("analytics_categories")
                  .insert({ name: row.category_name.trim().toUpperCase() })
                  .select("id")
                  .single();
                categoryId = newCat?.id ?? null;
              }
            }
            const { data: newProd } = await supabase
              .from("analytics_products")
              .insert({
                stock_code: row.stock_code,
                name: row.product_name || row.stock_code,
                category_id: categoryId,
              })
              .select("id")
              .single();
            productId = newProd?.id ?? null;
          }
          if (!productId) { skipped.push(row.row_number); continue; }

          // Create junction link
          const { error: supProdErr } = await supabase.from("analytics_supplier_products").upsert(
            {
              supplier_id: supplierId,
              product_id: productId,
              pack_size: row.pack_size || null,
            },
            { onConflict: "supplier_id,product_id" }
          );
          if (supProdErr) {
            errors.push("Row " + row.row_number + ": supplier-product link failed: " + supProdErr.message);
            continue;
          }
          imported.push(row.row_number);
        } catch (e) {
          errors.push(`Row ${row.row_number}: ${e instanceof Error ? e.message : "Unknown error"}`);
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
