import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { getAdminClient } from "@/lib/supabase/admin";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const CHAIN_WIDE_BRANCH_CODE = "__CHAIN__";

async function ensureChainWideBranch(supabase: SupabaseClient): Promise<string> {
  const { data: existing } = await supabase
    .from("analytics_branches")
    .select("id")
    .eq("code", CHAIN_WIDE_BRANCH_CODE)
    .maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await supabase
    .from("analytics_branches")
    .insert({ name: "Chain-Wide (All Stores)", code: CHAIN_WIDE_BRANCH_CODE, active: true })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

async function resolveSupplierByName(supabase: SupabaseClient, name: string, code?: string | null): Promise<string | null> {
  const { data: existing } = await supabase
    .from("analytics_suppliers")
    .select("id")
    .ilike("name", name.trim())
    .maybeSingle();
  if (existing) return existing.id;
  const { data: created, error } = await supabase
    .from("analytics_suppliers")
    .insert({ name: name.trim(), code: code || null })
    .select("id")
    .single();
  if (error) throw error;
  return created?.id ?? null;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = getAdminClient();
    if (!isAdmin(currentUser.role) && currentUser.role !== "data_handler" && currentUser.role !== "finance") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get upload details
    const { data: upload, error: uploadError } = await db
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
    const { data: allRows, error: rowsError } = await db
      .from("analytics_staging_rows")
      .select("*")
      .eq("upload_id", id)
      .not("stock_code", "is", null)
      .not("stock_code", "eq", "")
      .order("row_number");

    // Also get count of skipped rows for the summary
    const { data: allStagingRows } = await db
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

    // Pre-check: query existing fact data to report what's already imported
    const alreadyImported: number[] = [];
    if (upload.period_id) {
      const stockCodes = rows.map(function(r) { return r.stock_code; }).filter(Boolean);
      if (stockCodes.length > 0) {
        const { data: existingProducts } = await db
          .from("analytics_products")
          .select("id, stock_code")
          .in("stock_code", stockCodes);

        if (existingProducts && existingProducts.length > 0) {
          const productIds = existingProducts.map(function(p) { return p.id; });
          const { data: existingSales } = await db
            .from("analytics_fact_sales")
            .select("product_id")
            .eq("period_id", upload.period_id)
            .in("product_id", productIds);

          if (existingSales && existingSales.length > 0) {
            const existingProductIds = new Set(existingSales.map(function(s) { return s.product_id; }));
            const codeToRow = new Map();
            rows.forEach(function(r) { codeToRow.set(r.stock_code, r); });
            existingProducts.forEach(function(p) {
              if (existingProductIds.has(p.id)) {
                const row = codeToRow.get(p.stock_code);
                if (row) alreadyImported.push(row.row_number);
              }
            });
          }
        }
      }
    }

    const imported: number[] = [];
    const skipped: number[] = [];
    const errors: string[] = [];

    // For per_store_sales and chain_wide_sales → insert into analytics_fact_sales
    if (upload.file_type === "per_store_sales" || upload.file_type === "chain_wide_sales") {
      // Chain-wide/aggregate uploads that carry no store resolve to the
      // designated __CHAIN__ branch instead of an all-zeros id (FK-safe).
      let branchId = upload.branch_id;
      if (!branchId) {
        try {
          branchId = await ensureChainWideBranch(db);
        } catch {
          errors.push("Could not resolve chain-wide branch");
        }
      }

      for (const row of rows) {
        try {
          if (!row.stock_code) {
            skipped.push(row.row_number);
            continue;
          }

          // Find or create product
          let productId: string | null = null;

          const { data: existing } = await db
            .from("analytics_products")
            .select("id, category_id")
            .eq("stock_code", row.stock_code)
            .maybeSingle();

          if (existing) {
            productId = existing.id;
          } else if (row.product_name) {
            const { data: newProduct } = await db
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
            const { data: prodInfo } = await db
              .from("analytics_products")
              .select("category_id, sub_category_id")
              .eq("id", productId)
              .single();
            if (prodInfo) {
              salesCategoryId = prodInfo.category_id || salesCategoryId;
              salesSubCategoryId = prodInfo.sub_category_id || null;
            }
          }

          // Resolve supplier attribution so competitor share is correct:
          // prefer an explicit supplier on the row, then the product's default.
          let salesSupplierId: string | null = null;
          if (row.supplier_name) {
            salesSupplierId = await resolveSupplierByName(db, String(row.supplier_name), row.supplier_code || null);
          } else {
            const { data: prodDef } = await db
              .from("analytics_products")
              .select("default_supplier_id")
              .eq("id", productId)
              .maybeSingle();
            salesSupplierId = prodDef?.default_supplier_id ?? null;
          }

          // Check for existing sales row (no UNIQUE constraint reliance)
          const branchVal = branchId;
          const salesFields = {
            period_id: upload.period_id,
            branch_id: branchVal,
            category_id: salesCategoryId,
            sub_category_id: salesSubCategoryId,
            product_id: productId,
            supplier_id: salesSupplierId,
            quantity: row.quantity ?? 0,
            weight_tonnes: row.weight_tonnes ?? 0,
            unit_price: row.unit_price ?? null,
            total_amount: totalAmount,
            cost_amount: row.unit_cost ? row.quantity * row.unit_cost : 0,
          };
          const { data: existingSale } = await db
            .from("analytics_fact_sales")
            .select("id")
            .eq("period_id", upload.period_id)
            .eq("branch_id", branchVal)
            .eq("product_id", productId)
            .maybeSingle();
          if (existingSale) {
            const { error: salesErr } = await db
              .from("analytics_fact_sales")
              .update(salesFields)
              .eq("id", existingSale.id);
            if (salesErr) {
              errors.push("Row " + row.row_number + ": sales update failed: " + salesErr.message);
              continue;
            }
          } else {
            const { error: salesErr } = await db
              .from("analytics_fact_sales")
              .insert(salesFields);
            if (salesErr) {
              errors.push("Row " + row.row_number + ": sales insert failed: " + salesErr.message);
              continue;
            }
          }

          // Also populate pricing fact table (per_store_sales only)
          if (upload.file_type === "per_store_sales" && (row.unit_cost || row.unit_price || row.weight_tonnes)) {
            // Check for existing pricing row
              const pricingBranchVal = branchId || null;
              const pricingFields = {
                period_id: upload.period_id,
                product_id: productId,
                branch_id: pricingBranchVal,
                category_id: salesCategoryId,
                sub_category_id: salesSubCategoryId,
                standard_cost: row.unit_cost ?? null,
                selling_price: row.unit_price ?? null,
                weight_tonnes: row.weight_tonnes ?? null,
              };
              const { data: existingPricing } = await db
                .from("analytics_fact_pricing")
                .select("id")
                .eq("period_id", upload.period_id)
                .eq("product_id", productId)
                .eq("branch_id", pricingBranchVal)
                .maybeSingle();
              if (existingPricing) {
                const { error: pricingErr } = await db
                  .from("analytics_fact_pricing")
                  .update(pricingFields)
                  .eq("id", existingPricing.id);
                if (pricingErr) {
                  errors.push("Row " + row.row_number + ": pricing update failed: " + pricingErr.message);
                  continue;
                }
              } else {
                const { error: pricingErr } = await db
                  .from("analytics_fact_pricing")
                  .insert(pricingFields);
                if (pricingErr) {
                  errors.push("Row " + row.row_number + ": pricing insert failed: " + pricingErr.message);
                  continue;
                }
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
            const { data: existing } = await db
              .from("analytics_products")
              .select("id")
              .eq("stock_code", row.stock_code)
              .single();
            if (existing) {
              productId = existing.id;
            } else {
              const { data: newProd } = await db
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
          if (productId) {
            const { data: prodCat } = await db
              .from("analytics_products")
              .select("category_id, sub_category_id")
              .eq("id", productId)
              .single();
            if (prodCat) {
              invCategoryId = prodCat.category_id || null;
            }
          }

          // Check for existing inventory row
          const unitCost = row.unit_cost ? parseFloat(String(row.unit_cost).replace(/[^\d.-]/g, "")) : 0;
          const invQty = row.quantity ?? 0;
          const invFields = {
            period_id: upload.period_id,
            product_id: productId,
            branch_id: upload.branch_id,
            category_id: invCategoryId,
            closing_stock: invQty,
            stock_value: invQty * unitCost,
          };
          const { data: existingInv } = await db
            .from("analytics_fact_inventory")
            .select("id")
            .eq("period_id", upload.period_id)
            .eq("product_id", productId)
            .eq("branch_id", upload.branch_id)
            .maybeSingle();
          if (existingInv) {
            const { error: invErr } = await db
              .from("analytics_fact_inventory")
              .update(invFields)
              .eq("id", existingInv.id);
            if (invErr) {
              errors.push("Row " + row.row_number + ": inventory update failed: " + invErr.message);
              continue;
            }
          } else {
            const { error: invErr } = await db
              .from("analytics_fact_inventory")
              .insert(invFields);
            if (invErr) {
              errors.push("Row " + row.row_number + ": inventory insert failed: " + invErr.message);
              continue;
            }
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
            const { data: existingCat } = await db
              .from("analytics_categories")
              .select("id")
              .ilike("name", categoryName.trim())
              .single();
            if (existingCat) {
              categoryId = existingCat.id;
            } else {
              const { data: newCat } = await db
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
            const { data: existingSub } = await db
              .from("analytics_subcategories")
              .select("id")
              .eq("category_id", categoryId)
              .ilike("name", subCatName.trim())
              .single();
            if (existingSub) {
              subCategoryId = existingSub.id;
            } else {
              const { data: newSub } = await db
                .from("analytics_subcategories")
                .insert({ category_id: categoryId, name: subCatName.trim().toUpperCase() })
                .select("id")
                .single();
              subCategoryId = newSub?.id ?? null;
            }
          }

          // Upsert product
          // Check for existing product
          const { data: existingProdCheck } = await db
            .from("analytics_products")
            .select("id")
            .eq("stock_code", row.stock_code)
            .maybeSingle();
          if (existingProdCheck) {
            const { error: prodErr } = await db
              .from("analytics_products")
              .update({
                name: row.product_name || row.stock_code,
                category_id: categoryId,
                sub_category_id: subCategoryId,
                sub_category: row.sub_category || null,
                pack_size: row.pack_size || null,
              })
              .eq("id", existingProdCheck.id);
            if (prodErr) {
              errors.push("Row " + row.row_number + ": product update failed: " + prodErr.message);
              continue;
            }
          } else {
            const { error: prodErr } = await db
              .from("analytics_products")
              .insert({
                stock_code: row.stock_code,
                name: row.product_name || row.stock_code,
                category_id: categoryId,
                sub_category_id: subCategoryId,
                sub_category: row.sub_category || null,
                pack_size: row.pack_size || null,
              });
            if (prodErr) {
              errors.push("Row " + row.row_number + ": product insert failed: " + prodErr.message);
              continue;
            }
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
          const { data: existingSup } = await db
            .from("analytics_suppliers")
            .select("id")
            .ilike("name", row.supplier_name.trim())
            .single();
          if (existingSup) {
            supplierId = existingSup.id;
          } else {
            const { data: newSup } = await db
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
          const { data: existingProd } = await db
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
              const { data: cat } = await db
                .from("analytics_categories")
                .select("id")
                .ilike("name", row.category_name.trim())
                .single();
              if (cat) {
                categoryId = cat.id;
              } else {
                const { data: newCat } = await db
                  .from("analytics_categories")
                  .insert({ name: row.category_name.trim().toUpperCase() })
                  .select("id")
                  .single();
                categoryId = newCat?.id ?? null;
              }
            }
            const { data: newProd } = await db
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
          // Check for existing supplier-product link
          const { data: existingSupProd } = await db
            .from("analytics_supplier_products")
            .select("id")
            .eq("supplier_id", supplierId)
            .eq("product_id", productId)
            .maybeSingle();
          if (existingSupProd) {
            const { error: supProdErr } = await db
              .from("analytics_supplier_products")
              .update({ pack_size: row.pack_size || null })
              .eq("id", existingSupProd.id);
            if (supProdErr) {
              errors.push("Row " + row.row_number + ": supplier-product update failed: " + supProdErr.message);
              continue;
            }
          } else {
            const { error: supProdErr } = await db
              .from("analytics_supplier_products")
              .insert({
                supplier_id: supplierId,
                product_id: productId,
                pack_size: row.pack_size || null,
              });
            if (supProdErr) {
              errors.push("Row " + row.row_number + ": supplier-product insert failed: " + supProdErr.message);
              continue;
            }
          }
          imported.push(row.row_number);
        } catch (e) {
          errors.push(`Row ${row.row_number}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    }

    // For item_list_master → upsert products + supplier links (reference data)
    if (upload.file_type === "item_list_master") {
      for (const row of rows) {
        try {
          if (!row.stock_code || !row.product_name) { skipped.push(row.row_number); continue; }

          // Resolve category
          let categoryId: string | null = null;
          if (row.category) {
            const { data: existingCat } = await db
              .from("analytics_categories")
              .select("id")
              .ilike("name", row.category.trim())
              .single();
            if (existingCat) {
              categoryId = existingCat.id;
            }
          }

          // Resolve sub-category
          let subCategoryId: string | null = null;
          if (row.sub_category && categoryId) {
            const { data: existingSub } = await db
              .from("analytics_subcategories")
              .select("id")
              .eq("category_id", categoryId)
              .ilike("name", row.sub_category.trim())
              .single();
            if (existingSub) {
              subCategoryId = existingSub.id;
            } else {
              // Create new sub-category
              const { data: newSub } = await db
                .from("analytics_subcategories")
                .insert({ category_id: categoryId, name: row.sub_category.trim().toUpperCase() })
                .select("id")
                .single();
              subCategoryId = newSub?.id ?? null;
            }
          }

          // Upsert product
          const { data: existingProdCheck } = await db
            .from("analytics_products")
            .select("id")
            .eq("stock_code", row.stock_code)
            .maybeSingle();

          let productId: string | null = null;
          if (existingProdCheck) {
            const { error: prodErr } = await db
              .from("analytics_products")
              .update({
                name: row.product_name,
                category_id: categoryId,
                sub_category_id: subCategoryId,
                sub_category: row.sub_category || null,
              })
              .eq("id", existingProdCheck.id);
            if (prodErr) {
              errors.push("Row " + row.row_number + ": product update failed: " + prodErr.message);
              continue;
            }
            productId = existingProdCheck.id;
          } else {
            const { error: prodErr, data: newProd } = await db
              .from("analytics_products")
              .insert({
                stock_code: row.stock_code,
                name: row.product_name,
                category_id: categoryId,
                sub_category_id: subCategoryId,
                sub_category: row.sub_category || null,
              })
              .select("id")
              .single();
            if (prodErr) {
              errors.push("Row " + row.row_number + ": product insert failed: " + prodErr.message);
              continue;
            }
            productId = newProd?.id ?? null;
          }

          // Link to suppliers (Suppliers column may contain multiple names)
          if (productId && row.suppliers) {
            const supplierNames = String(row.suppliers)
              .split(/[,;|]/)
              .map((s) => s.trim())
              .filter(Boolean);
            for (const supName of supplierNames) {
              const { data: existingSup } = await db
                .from("analytics_suppliers")
                .select("id")
                .ilike("name", supName)
                .single();
              if (existingSup) {
                const { data: existingLink } = await db
                  .from("analytics_supplier_products")
                  .select("id")
                  .eq("supplier_id", existingSup.id)
                  .eq("product_id", productId)
                  .maybeSingle();
                if (!existingLink) {
                  await db
                    .from("analytics_supplier_products")
                    .insert({ supplier_id: existingSup.id, product_id: productId })
                    .select()
                    .single();
                }
              }
            }
          }

          imported.push(row.row_number);
        } catch (e) {
          errors.push(`Row ${row.row_number}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    }

    const status = errors.length === 0 ? "imported" : errors.length < rows.length ? "imported" : "failed";

    await db
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
      alreadyImported: alreadyImported.length,
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
