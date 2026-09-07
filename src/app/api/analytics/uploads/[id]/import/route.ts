import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const CHAIN_WIDE_BRANCH_CODE = "__CHAIN__";

interface StagingRow {
  row_number: number;
  stock_code: string | null;
  product_name: string | null;
  sub_category: string | null;
  unit_cost: number | null;
  unit_price: number | null;
  quantity: number | null;
  weight_tonnes: number | null;
  total_amount: number | null;
  supplier_code: string | null;
  mapped_fields: Record<string, unknown> | null;
  [key: string]: unknown;
}

// Extended mapped fields (persisted by the upload wizard from migration 076)
function pickField(row: Record<string, unknown>, key: string): string | null {
  const mf = row.mapped_fields as Record<string, unknown> | null | undefined;
  const raw = mf && mf[key] !== undefined ? mf[key] : row[key];
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  return s === "" ? null : s;
}

function parseNumber(value: string | number | null | undefined): number | null {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).replace(/[KES,kes\s]/g, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = String(value).trim();
  if (v === "") return null;
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const d = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    if (!Number.isNaN(Date.parse(d))) return d;
  }
  m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    let dd = a;
    let mm = b;
    // Kenyan convention: DD/MM/YYYY, but tolerate MM/DD when unambiguous.
    if (a > 12) { dd = a; mm = b; } else if (b > 12) { dd = b; mm = a; }
    const d = `${m[3]}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    if (!Number.isNaN(Date.parse(d))) return d;
  }
  const t = Date.parse(v);
  if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return null;
}

function normalizeMovementType(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = String(value).toLowerCase().replace(/[^a-z/-]/g, " ").trim();
  if (v === "") return null;
  if (/transfer/.test(v)) return "transfer";
  if (/return/.test(v)) return "return";
  if (/(^| )adjust|stock ?take|write-?off/.test(v)) return "adjustment";
  if (/(^| )in( |$)|inbound|receipt|goods in|goods received|purchase|grn|stock ?in|deliver/.test(v)) return "in";
  if (/(^| )out( |$)|outbound|issue|sales|sale|dispatch|goods out|stock ?out|despatch/.test(v)) return "out";
  return null;
}

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

async function resolveProduct(
  db: SupabaseClient,
  stockCode: string,
  productName?: string | null,
): Promise<string | null> {
  const { data: existing } = await db
    .from("analytics_products")
    .select("id")
    .eq("stock_code", stockCode)
    .maybeSingle();
  if (existing) return existing.id;
  if (!productName) return null;
  const { data: created, error } = await db
    .from("analytics_products")
    .insert({ stock_code: stockCode, name: productName })
    .select("id")
    .single();
  if (error) throw error;
  return created?.id ?? null;
}

async function resolveProductCategory(
  db: SupabaseClient,
  productId: string,
): Promise<{ category_id: string | null; sub_category_id: string | null }> {
  const { data } = await db
    .from("analytics_products")
    .select("category_id, sub_category_id")
    .eq("id", productId)
    .single();
  return { category_id: data?.category_id ?? null, sub_category_id: data?.sub_category_id ?? null };
}

async function resolveProductSupplier(
  db: SupabaseClient,
  productId: string,
  row: Record<string, unknown>,
): Promise<string | null> {
  const supplierName = pickField(row, "supplier_name");
  if (supplierName) {
    return resolveSupplierByName(db, supplierName, pickField(row, "supplier_code"));
  }
  const { data: prodDef } = await db
    .from("analytics_products")
    .select("default_supplier_id")
    .eq("id", productId)
    .maybeSingle();
  return prodDef?.default_supplier_id ?? null;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = supabase;
    if (!currentUser.role) {
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

    // Sales-type imports need a period; reference-data imports (supplier
    // details, pricing, stock movements, GRNs) do not.
    const requiresPeriod = ["per_store_sales", "chain_wide_sales", "sales_transactions", "per_supplier_sales"].includes(upload.file_type);
    if (requiresPeriod && !upload.period_id) {
      return NextResponse.json(
        { error: "Upload has no period assigned. Set period_id first." },
        { status: 400 },
      );
    }

    // Get all staging rows (each handler decides which rows it can use).
    const { data: allRows, error: rowsError } = await db
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

    const rows = (allRows ?? []) as StagingRow[];
    const totalStagingRows = rows.length;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No staging rows to import" },
        { status: 400 },
      );
    }

    const imported: number[] = [];
    const skipped: number[] = [];
    const errors: string[] = [];

    // ── Sales: per_store_sales, chain_wide_sales, per_supplier_sales ──
    if (
      upload.file_type === "per_store_sales" ||
      upload.file_type === "chain_wide_sales" ||
      upload.file_type === "per_supplier_sales"
    ) {
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
            skipped.push(Number(row.row_number));
            continue;
          }

          const productId = await resolveProduct(db, String(row.stock_code), pickField(row, "product_name"));
          if (!productId) {
            errors.push(`Row ${row.row_number}: unknown stock_code "${row.stock_code}"`);
            continue;
          }

          const quantity = parseNumber(row.quantity) ?? 0;
          const unitPrice = parseNumber(row.unit_price);
          const totalAmount =
            parseNumber(row.total_amount) ??
            (quantity > 0 && unitPrice !== null ? quantity * unitPrice : 0);

          const { category_id: salesCategoryId, sub_category_id: salesSubCategoryId } =
            await resolveProductCategory(db, productId);
          const salesSupplierId = await resolveProductSupplier(db, productId, row);

          const branchVal = branchId;
          const salesFields = {
            period_id: upload.period_id,
            branch_id: branchVal,
            category_id: salesCategoryId,
            sub_category_id: salesSubCategoryId,
            product_id: productId,
            supplier_id: salesSupplierId,
            quantity: quantity,
            weight_tonnes: parseNumber(row.weight_tonnes) ?? 0,
            unit_price: unitPrice,
            total_amount: totalAmount,
            cost_amount: quantity * (parseNumber(row.unit_cost) ?? 0),
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

          // Populate pricing fact for per_store_sales only
          if (upload.file_type === "per_store_sales" && (row.unit_cost || row.unit_price || row.weight_tonnes)) {
            const pricingFields = {
              period_id: upload.period_id,
              product_id: productId,
              branch_id: branchVal,
              category_id: salesCategoryId,
              sub_category_id: salesSubCategoryId,
              standard_cost: parseNumber(row.unit_cost),
              selling_price: unitPrice,
              weight_tonnes: parseNumber(row.weight_tonnes),
            };
            const { data: existingPricing } = await db
              .from("analytics_fact_pricing")
              .select("id")
              .eq("period_id", upload.period_id)
              .eq("product_id", productId)
              .eq("branch_id", branchVal)
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

          imported.push(Number(row.row_number));
        } catch (e) {
          errors.push(`Row ${row.row_number}: ${e instanceof Error ? e.message : "unexpected error"}`);
        }
      }
    }

    // ── Sales transactions: line-item sales → aggregate into fact_sales ──
    if (upload.file_type === "sales_transactions") {
      let branchId = upload.branch_id;
      if (!branchId) {
        try {
          branchId = await ensureChainWideBranch(db);
        } catch {
          errors.push("Could not resolve chain-wide branch");
        }
      }

      const byProduct = new Map<string, { productId: string; quantity: number; total: number; weight: number; vat: number; row: Record<string, unknown> }>();
      for (const row of rows) {
        try {
          if (!row.stock_code) {
            skipped.push(Number(row.row_number));
            continue;
          }
          const productId = await resolveProduct(db, String(row.stock_code), pickField(row, "product_name"));
          if (!productId) {
            errors.push(`Row ${row.row_number}: unknown stock_code "${row.stock_code}"`);
            continue;
          }
          const existing = byProduct.get(productId) ?? {
            productId,
            quantity: 0,
            total: 0,
            weight: 0,
            vat: 0,
            row,
          };
          existing.quantity += parseNumber(row.quantity) ?? 0;
          existing.total += parseNumber(row.total_amount) ?? (parseNumber(row.quantity) ?? 0) * (parseNumber(row.unit_price) ?? 0);
          existing.weight += parseNumber(row.weight_tonnes) ?? 0;
          existing.vat += parseNumber(pickField(row, "tax")) ?? 0;
          byProduct.set(productId, existing);
        } catch (e) {
          errors.push(`Row ${row.row_number}: ${e instanceof Error ? e.message : "unexpected error"}`);
        }
      }

      for (const agg of byProduct.values()) {
        try {
          const { category_id, sub_category_id } = await resolveProductCategory(db, agg.productId);
          const supplierId = await resolveProductSupplier(db, agg.productId, agg.row);
          const unitPrice = agg.quantity > 0 ? agg.total / agg.quantity : null;
          const salesFields = {
            period_id: upload.period_id,
            branch_id: branchId,
            category_id,
            sub_category_id,
            product_id: agg.productId,
            supplier_id: supplierId,
            quantity: agg.quantity,
            weight_tonnes: agg.weight,
            unit_price: unitPrice,
            total_amount: agg.total,
            cost_amount: 0,
            vat_amount: agg.vat,
          };
          const { data: existingSale } = await db
            .from("analytics_fact_sales")
            .select("id")
            .eq("period_id", upload.period_id)
            .eq("branch_id", branchId)
            .eq("product_id", agg.productId)
            .maybeSingle();
          if (existingSale) {
            const { error } = await db
              .from("analytics_fact_sales")
              .update(salesFields)
              .eq("id", existingSale.id);
            if (error) {
              errors.push("sales_transactions update failed: " + error.message);
              continue;
            }
          } else {
            const { error } = await db
              .from("analytics_fact_sales")
              .insert(salesFields);
            if (error) {
              errors.push("sales_transactions insert failed: " + error.message);
              continue;
            }
          }
          imported.push(Number(agg.row.row_number));
        } catch (e) {
          errors.push(`Row ${agg.row.row_number}: ${e instanceof Error ? e.message : "unexpected error"}`);
        }
      }
    }

    // ── Inventory ───────────────────────────────────────────────
    if (upload.file_type === "inventory") {
      for (const row of rows) {
        try {
          if (!row.stock_code) { skipped.push(Number(row.row_number)); continue; }
          const productId = await resolveProduct(db, String(row.stock_code), pickField(row, "product_name") || String(row.stock_code));
          if (!productId) { skipped.push(Number(row.row_number)); continue; }

          const { category_id: invCategoryId } = await resolveProductCategory(db, productId);
          const unitCost = parseNumber(row.unit_cost) ?? 0;
          const invQty = parseNumber(row.quantity) ?? 0;
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
          imported.push(Number(row.row_number));
        } catch (e) {
          errors.push(`Row ${row.row_number}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    }

    // ── Product master ──────────────────────────────────────────
    if (upload.file_type === "product_master") {
      for (const row of rows) {
        try {
          if (!row.stock_code) { skipped.push(Number(row.row_number)); continue; }

          let categoryId: string | null = null;
          const categoryName = pickField(row, "category_name") || pickField(row, "sub_category") || pickField(row, "category");
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

          let subCategoryId: string | null = null;
          const subCatName = pickField(row, "sub_category_name") || pickField(row, "sub_category");
          if (subCatName && categoryId) {
            const { data: existingSub } = await db
              .from("analytics_subcategories")
              .select("id")
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

          const { data: existingProdCheck } = await db
            .from("analytics_products")
            .select("id")
            .eq("stock_code", row.stock_code)
            .maybeSingle();
          const prodFields = {
            name: pickField(row, "product_name") || row.stock_code,
            category_id: categoryId,
            sub_category_id: subCategoryId,
            sub_category: pickField(row, "sub_category"),
            pack_size: pickField(row, "pack_size"),
          };
          if (existingProdCheck) {
            const { error: prodErr } = await db
              .from("analytics_products")
              .update(prodFields)
              .eq("id", existingProdCheck.id);
            if (prodErr) {
              errors.push("Row " + row.row_number + ": product update failed: " + prodErr.message);
              continue;
            }
          } else {
            const { error: prodErr } = await db
              .from("analytics_products")
              .insert({ stock_code: row.stock_code, ...prodFields });
            if (prodErr) {
              errors.push("Row " + row.row_number + ": product insert failed: " + prodErr.message);
              continue;
            }
          }
          imported.push(Number(row.row_number));
        } catch (e) {
          errors.push(`Row ${row.row_number}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    }

    // ── Supplier products + supplier item allocations (junction) ──
    if (upload.file_type === "supplier_products" || upload.file_type === "supplier_item_allocations") {
      for (const row of rows) {
        try {
          const supplierName = pickField(row, "supplier_name");
          if (!row.stock_code || !supplierName) { skipped.push(Number(row.row_number)); continue; }

          const supplierId = await resolveSupplierByName(db, supplierName, pickField(row, "supplier_code"));
          if (!supplierId) { skipped.push(Number(row.row_number)); continue; }

          const productId = await resolveProduct(db, String(row.stock_code), pickField(row, "product_name") || String(row.stock_code));
          if (!productId) { skipped.push(Number(row.row_number)); continue; }

          const linkFields = {
            supplier_id: supplierId,
            product_id: productId,
            supplier_item_code: pickField(row, "supplier_item_code"),
            pack_size: pickField(row, "pack_size"),
          };
          const { data: existingSupProd } = await db
            .from("analytics_supplier_products")
            .select("id")
            .eq("supplier_id", supplierId)
            .eq("product_id", productId)
            .maybeSingle();
          if (existingSupProd) {
            const { error: supProdErr } = await db
              .from("analytics_supplier_products")
              .update({ ...linkFields, active: true })
              .eq("id", existingSupProd.id);
            if (supProdErr) {
              errors.push("Row " + row.row_number + ": supplier-product update failed: " + supProdErr.message);
              continue;
            }
          } else {
            const { error: supProdErr } = await db
              .from("analytics_supplier_products")
              .insert(linkFields);
            if (supProdErr) {
              errors.push("Row " + row.row_number + ": supplier-product insert failed: " + supProdErr.message);
              continue;
            }
          }
          imported.push(Number(row.row_number));
        } catch (e) {
          errors.push(`Row ${row.row_number}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    }

    // ── Item list master → reference products + supplier links ──
    if (upload.file_type === "item_list_master") {
      for (const row of rows) {
        try {
          const productName = pickField(row, "product_name");
          if (!row.stock_code || !productName) { skipped.push(Number(row.row_number)); continue; }

          let categoryId: string | null = null;
          const categoryName = pickField(row, "category");
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

          let subCategoryId: string | null = null;
          const subCatName = pickField(row, "sub_category");
          if (subCatName && categoryId) {
            const { data: existingSub } = await db
              .from("analytics_subcategories")
              .select("id")
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

          const existingProdCheck = await db
            .from("analytics_products")
            .select("id")
            .eq("stock_code", row.stock_code)
            .maybeSingle();

          let productId: string | null = null;
          if (existingProdCheck.data) {
            const { error: prodErr } = await db
              .from("analytics_products")
              .update({
                name: productName,
                category_id: categoryId,
                sub_category_id: subCategoryId,
                sub_category: subCatName,
              })
              .eq("id", existingProdCheck.data.id);
            if (prodErr) {
              errors.push("Row " + row.row_number + ": product update failed: " + prodErr.message);
              continue;
            }
            productId = existingProdCheck.data.id;
          } else {
            const { error: prodErr, data: newProd } = await db
              .from("analytics_products")
              .insert({
                stock_code: row.stock_code,
                name: productName,
                category_id: categoryId,
                sub_category_id: subCategoryId,
                sub_category: subCatName,
              })
              .select("id")
              .single();
            if (prodErr) {
              errors.push("Row " + row.row_number + ": product insert failed: " + prodErr.message);
              continue;
            }
            productId = newProd?.id ?? null;
          }

          const suppliersRaw = pickField(row, "suppliers");
          if (productId && suppliersRaw) {
            const supplierNames = String(suppliersRaw)
              .split(/[,;|]/)
              .map((s) => s.trim())
              .filter(Boolean);
            for (const supName of supplierNames) {
              const supId = await resolveSupplierByName(db, supName);
              if (!supId) continue;
              const { data: existingLink } = await db
                .from("analytics_supplier_products")
                .select("id")
                .eq("supplier_id", supId)
                .eq("product_id", productId)
                .maybeSingle();
              if (!existingLink) {
                await db
                  .from("analytics_supplier_products")
                  .insert({ supplier_id: supId, product_id: productId })
                  .select()
                  .single();
              }
            }
          }

          imported.push(Number(row.row_number));
        } catch (e) {
          errors.push(`Row ${row.row_number}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    }

    // ── Stock movements → analytics_fact_stock_movements ────────
    if (upload.file_type === "stock_movements") {
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
          if (!row.stock_code) { skipped.push(Number(row.row_number)); continue; }

          const productId = await resolveProduct(db, String(row.stock_code), pickField(row, "product_name") || String(row.stock_code));
          if (!productId) { skipped.push(Number(row.row_number)); continue; }

          const movementType = normalizeMovementType(pickField(row, "movement_type"));
          if (!movementType) {
            errors.push(`Row ${row.row_number}: missing/invalid movement type`);
            continue;
          }
          const movementDate = parseDate(pickField(row, "movement_date")) ?? new Date().toISOString().slice(0, 10);

          const quantity = parseNumber(row.quantity);
          if (quantity === null) {
            errors.push(`Row ${row.row_number}: quantity required`);
            continue;
          }
          const unitCost = parseNumber(row.unit_cost);
          const totalCost = parseNumber(row.total_amount) ?? (unitCost !== null ? quantity * unitCost : null);
          const supplierId = await resolveProductSupplier(db, productId, row);

          const movementFields = {
            movement_date: movementDate,
            product_id: productId,
            branch_id: branchId,
            supplier_id: supplierId,
            movement_type: movementType,
            quantity,
            unit_cost: unitCost,
            total_cost: totalCost,
            reference_number: pickField(row, "reference_number"),
            batch_number: pickField(row, "batch_number"),
            expiry_date: parseDate(pickField(row, "expiry_date")),
            warehouse: pickField(row, "warehouse"),
            notes: pickField(row, "notes"),
          };
          const { data: existingMovement } = await db
            .from("analytics_fact_stock_movements")
            .select("id")
            .eq("movement_date", movementDate)
            .eq("product_id", productId)
            .eq("branch_id", branchId)
            .eq("movement_type", movementType)
            .eq("reference_number", movementFields.reference_number ?? "___NONE___")
            .maybeSingle();
          if (existingMovement) {
            const { error: mvErr } = await db
              .from("analytics_fact_stock_movements")
              .update(movementFields)
              .eq("id", existingMovement.id);
            if (mvErr) {
              errors.push("Row " + row.row_number + ": movement update failed: " + mvErr.message);
              continue;
            }
          } else {
            const { error: mvErr } = await db
              .from("analytics_fact_stock_movements")
              .insert(movementFields);
            if (mvErr) {
              errors.push("Row " + row.row_number + ": movement insert failed: " + mvErr.message);
              continue;
            }
          }
          imported.push(Number(row.row_number));
        } catch (e) {
          errors.push(`Row ${row.row_number}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    }

    // ── Pending GRNs → stock movements 'in' ─────────────────────
    if (upload.file_type === "pending_grns") {
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
          const supplierName = pickField(row, "supplier_name");
          if (!supplierName) {
            skipped.push(Number(row.row_number));
            continue;
          }
          if (!row.stock_code) {
            errors.push(`Row ${row.row_number}: GRN needs a stock_code to map to a stock movement`);
            continue;
          }

          const productId = await resolveProduct(db, String(row.stock_code), pickField(row, "product_name") || String(row.stock_code));
          if (!productId) { skipped.push(Number(row.row_number)); continue; }

          const quantity = parseNumber(row.quantity);
          if (quantity === null) {
            errors.push(`Row ${row.row_number}: quantity required`);
            continue;
          }
          const supplierId = await resolveSupplierByName(db, supplierName, pickField(row, "supplier_code"));
          const unitCost = parseNumber(row.unit_cost);
          const totalCost = parseNumber(row.total_amount) ?? (unitCost !== null ? quantity * unitCost : null);

          const movementFields = {
            movement_date: new Date().toISOString().slice(0, 10),
            product_id: productId,
            branch_id: branchId,
            supplier_id: supplierId,
            movement_type: "in",
            quantity,
            unit_cost: unitCost,
            total_cost: totalCost,
            reference_number: pickField(row, "reference_number") || `GRN-${upload.id.slice(0, 8)}`,
            batch_number: pickField(row, "batch_number"),
            expiry_date: parseDate(pickField(row, "expiry_date")),
            warehouse: pickField(row, "warehouse"),
            notes: null,
          };
          const { data: existingMovement } = await db
            .from("analytics_fact_stock_movements")
            .select("id")
            .eq("movement_date", movementFields.movement_date)
            .eq("product_id", productId)
            .eq("branch_id", branchId)
            .eq("movement_type", "in")
            .eq("reference_number", movementFields.reference_number ?? "___NONE___")
            .maybeSingle();
          if (existingMovement) {
            const { error: mvErr } = await db
              .from("analytics_fact_stock_movements")
              .update(movementFields)
              .eq("id", existingMovement.id);
            if (mvErr) {
              errors.push("Row " + row.row_number + ": GRN update failed: " + mvErr.message);
              continue;
            }
          } else {
            const { error: mvErr } = await db
              .from("analytics_fact_stock_movements")
              .insert(movementFields);
            if (mvErr) {
              errors.push("Row " + row.row_number + ": GRN insert failed: " + mvErr.message);
              continue;
            }
          }
          imported.push(Number(row.row_number));
        } catch (e) {
          errors.push(`Row ${row.row_number}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    }

    // ── Supplier details → analytics_suppliers upsert ───────────
    if (upload.file_type === "supplier_details") {
      for (const row of rows) {
        try {
          const supplierName = pickField(row, "supplier_name") || pickField(row, "name");
          if (!supplierName) { skipped.push(Number(row.row_number)); continue; }

          const leadTimeDays = parseNumber(pickField(row, "lead_time_days"));
          const lead_time_days = leadTimeDays !== null && Number.isInteger(leadTimeDays) ? leadTimeDays : null;

          const { data: existingSupplier } = await db
            .from("analytics_suppliers")
            .select("id")
            .ilike("name", supplierName.trim())
            .maybeSingle();
          const supplierFields = {
            name: supplierName.trim(),
            code: pickField(row, "supplier_code"),
            contact_person: pickField(row, "contact_person"),
            phone: pickField(row, "phone"),
            email: pickField(row, "email"),
            payment_terms: pickField(row, "payment_terms"),
            lead_time_days,
            address: pickField(row, "address"),
            city: pickField(row, "city"),
            country: pickField(row, "country"),
            notes: pickField(row, "notes"),
          };
          if (existingSupplier) {
            const { error: supErr } = await db
              .from("analytics_suppliers")
              .update(supplierFields)
              .eq("id", existingSupplier.id);
            if (supErr) {
              errors.push("Row " + row.row_number + ": supplier update failed: " + supErr.message);
              continue;
            }
          } else {
            const { error: supErr } = await db
              .from("analytics_suppliers")
              .insert(supplierFields);
            if (supErr) {
              errors.push("Row " + row.row_number + ": supplier insert failed: " + supErr.message);
              continue;
            }
          }
          imported.push(Number(row.row_number));
        } catch (e) {
          errors.push(`Row ${row.row_number}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    }

    // ── Pricing → analytics_fact_pricing upsert ────────────────
    if (upload.file_type === "pricing") {
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
          if (!row.stock_code) { skipped.push(Number(row.row_number)); continue; }

          const productId = await resolveProduct(db, String(row.stock_code), pickField(row, "product_name") || String(row.stock_code));
          if (!productId) { skipped.push(Number(row.row_number)); continue; }

          const effectiveDate = parseDate(pickField(row, "effective_date")) ?? new Date().toISOString().slice(0, 10);
          const supplierId = await resolveProductSupplier(db, productId, row);
          const { category_id, sub_category_id } = await resolveProductCategory(db, productId);

          const pricingFields = {
            period_id: upload.period_id,
            product_id: productId,
            branch_id: branchId,
            category_id,
            sub_category_id,
            supplier_id: supplierId,
            effective_date: effectiveDate,
            standard_cost: parseNumber(row.unit_cost),
            selling_price: parseNumber(row.unit_price),
            unit_cost: parseNumber(row.unit_cost),
            unit_price: parseNumber(row.unit_price),
            weight_tonnes: parseNumber(row.weight_tonnes),
            tier: pickField(row, "tier") || "standard",
            min_quantity: parseNumber(pickField(row, "min_quantity")),
            max_quantity: parseNumber(pickField(row, "max_quantity")),
            discount_pct: parseNumber(pickField(row, "discount_pct")),
          };
          const { data: existingPricing } = await db
            .from("analytics_fact_pricing")
            .select("id")
            .eq("product_id", productId)
            .eq("branch_id", branchId)
            .eq("effective_date", effectiveDate)
            .eq("tier", pricingFields.tier)
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
          imported.push(Number(row.row_number));
        } catch (e) {
          errors.push(`Row ${row.row_number}: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
      }
    }

    const status = errors.length === 0 ? "imported" : errors.length < imported.length ? "imported" : "failed";

    await db
      .from("analytics_staging_uploads")
      .update({
        status,
        total_rows: totalStagingRows,
        error_rows: errors.length + skipped.length,
      })
      .eq("id", id);

    return NextResponse.json({
      imported: imported.length,
      skipped: skipped.length,
      alreadyImported: 0,
      errors,
      status,
    });
  } catch (e) {
    console.error("Import error:", e);
    return NextResponse.json(
      { error: "Failed to import data" },
      { status: 500 },
    );
  }
}