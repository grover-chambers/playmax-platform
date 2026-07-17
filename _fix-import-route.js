const fs = require("fs");
const path = "C:/PLAYMAX/playmax-platform-master with analytical changes/playmax-platform/src/app/api/analytics/uploads/[id]/import/route.ts";
let code = fs.readFileSync(path, "utf-8");

// 1. Sales upsert → check-then-insert/update
const salesUpPattern = /const \{ error: salesErr \} = await supabase\.from\("analytics_fact_sales"\)\.upsert\(\s*\{[\s\S]*?onConflict: "period_id,branch_id,product_id",[\s\S]*?\},[\s\S]*?\);[\s\S]*?if \(salesErr\) \{[\s\S]*?\}/;

const salesReplacement = `// Check for existing sales row (no UNIQUE constraint reliance)
          const branchVal = branchId || "00000000-0000-0000-0000-000000000000";
          const salesFields = {
            period_id: upload.period_id,
            branch_id: branchVal,
            category_id: salesCategoryId,
            sub_category_id: salesSubCategoryId,
            product_id: productId,
            quantity: row.quantity ?? 0,
            weight_tonnes: row.weight_tonnes ?? 0,
            unit_price: row.unit_price ?? null,
            total_amount: totalAmount,
            cost_amount: row.unit_cost ? row.quantity * row.unit_cost : 0,
          };
          const { data: existingSale } = await supabase
            .from("analytics_fact_sales")
            .select("id")
            .eq("period_id", upload.period_id)
            .eq("branch_id", branchVal)
            .eq("product_id", productId)
            .maybeSingle();
          if (existingSale) {
            const { error: salesErr } = await supabase
              .from("analytics_fact_sales")
              .update(salesFields)
              .eq("id", existingSale.id);
            if (salesErr) {
              errors.push("Row " + row.row_number + ": sales update failed: " + salesErr.message);
              continue;
            }
          } else {
            const { error: salesErr } = await supabase
              .from("analytics_fact_sales")
              .insert(salesFields);
            if (salesErr) {
              errors.push("Row " + row.row_number + ": sales insert failed: " + salesErr.message);
              continue;
            }
          }`;

if (salesUpPattern.test(code)) {
  code = code.replace(salesUpPattern, salesReplacement);
  console.log("OK: replaced sales upsert");
} else {
  console.log("WARN: sales upsert regex not matched");
}

// 2. Pricing upsert
const pricingUpPattern = /const \{ error: pricingErr \} = await supabase\.from\("analytics_fact_pricing"\)\.upsert\(\s*\{[\s\S]*?onConflict: "period_id,product_id,branch_id",[\s\S]*?\},[\s\S]*?\);[\s\S]*?if \(pricingErr\) \{[\s\S]*?\}/;

const pricingReplacement = `// Check for existing pricing row
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
              const { data: existingPricing } = await supabase
                .from("analytics_fact_pricing")
                .select("id")
                .eq("period_id", upload.period_id)
                .eq("product_id", productId)
                .eq("branch_id", pricingBranchVal)
                .maybeSingle();
              if (existingPricing) {
                const { error: pricingErr } = await supabase
                  .from("analytics_fact_pricing")
                  .update(pricingFields)
                  .eq("id", existingPricing.id);
                if (pricingErr) {
                  errors.push("Row " + row.row_number + ": pricing update failed: " + pricingErr.message);
                  continue;
                }
              } else {
                const { error: pricingErr } = await supabase
                  .from("analytics_fact_pricing")
                  .insert(pricingFields);
                if (pricingErr) {
                  errors.push("Row " + row.row_number + ": pricing insert failed: " + pricingErr.message);
                  continue;
                }
              }`;

if (pricingUpPattern.test(code)) {
  code = code.replace(pricingUpPattern, pricingReplacement);
  console.log("OK: replaced pricing upsert");
} else {
  console.log("WARN: pricing upsert regex not matched");
}

// 3. Inventory upsert
const invUpPattern = /const \{ error: invErr \} = await supabase\.from\("analytics_fact_inventory"\)\.upsert\([\s\S]*?onConflict: "snapshot_date,product_id,branch_id"[\s\S]*?\);[\s\S]*?if \(invErr\) \{[\s\S]*?continue;\s*\}[\s\S]*?imported\.push\(row\.row_number\);/;

const invReplacement = `// Check for existing inventory row
          const invSnapDate = new Date().toISOString().split("T")[0];
          const invFields = {
            snapshot_date: invSnapDate,
            product_id: productId,
            branch_id: upload.branch_id,
            supplier_id: upload.supplier_id || null,
            category_id: invCategoryId,
            sub_category_id: invSubCategoryId,
            quantity_on_hand: row.quantity ?? 0,
            unit_cost: row.unit_cost ? parseFloat(String(row.unit_cost).replace(/[^\\d.-]/g, "")) : null,
          };
          const { data: existingInv } = await supabase
            .from("analytics_fact_inventory")
            .select("id")
            .eq("snapshot_date", invSnapDate)
            .eq("product_id", productId)
            .eq("branch_id", upload.branch_id)
            .maybeSingle();
          if (existingInv) {
            const { error: invErr } = await supabase
              .from("analytics_fact_inventory")
              .update(invFields)
              .eq("id", existingInv.id);
            if (invErr) {
              errors.push("Row " + row.row_number + ": inventory update failed: " + invErr.message);
              continue;
            }
          } else {
            const { error: invErr } = await supabase
              .from("analytics_fact_inventory")
              .insert(invFields);
            if (invErr) {
              errors.push("Row " + row.row_number + ": inventory insert failed: " + invErr.message);
              continue;
            }
          }
          imported.push(row.row_number);`;

if (invUpPattern.test(code)) {
  code = code.replace(invUpPattern, invReplacement);
  console.log("OK: replaced inventory upsert");
} else {
  console.log("WARN: inventory upsert regex not matched");
}

// 4. Products upsert (product_master)
const prodUpPattern = /const \{ error: prodErr \} = await supabase\.from\("analytics_products"\)\.upsert\(\s*\{[\s\S]*?onConflict: "stock_code"[\s\S]*?\}\);[\s\S]*?if \(prodErr\) \{[\s\S]*?\}/;

const prodReplacement = `// Check for existing product
          const { data: existingProdCheck } = await supabase
            .from("analytics_products")
            .select("id")
            .eq("stock_code", row.stock_code)
            .maybeSingle();
          if (existingProdCheck) {
            const { error: prodErr } = await supabase
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
            const { error: prodErr } = await supabase
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
          imported.push(row.row_number);`;

if (prodUpPattern.test(code)) {
  code = code.replace(prodUpPattern, prodReplacement);
  console.log("OK: replaced products upsert");
} else {
  console.log("WARN: products upsert regex not matched");
}

// 5. Supplier products upsert
const supProdUpPattern = /const \{ error: supProdErr \} = await supabase\.from\("analytics_supplier_products"\)\.upsert\(\s*\{[\s\S]*?onConflict: "supplier_id,product_id"[\s\S]*?\}\);[\s\S]*?if \(supProdErr\) \{[\s\S]*?\}/;

const supProdReplacement = `// Check for existing supplier-product link
          const { data: existingSupProd } = await supabase
            .from("analytics_supplier_products")
            .select("id")
            .eq("supplier_id", supplierId)
            .eq("product_id", productId)
            .maybeSingle();
          if (existingSupProd) {
            const { error: supProdErr } = await supabase
              .from("analytics_supplier_products")
              .update({ pack_size: row.pack_size || null })
              .eq("id", existingSupProd.id);
            if (supProdErr) {
              errors.push("Row " + row.row_number + ": supplier-product update failed: " + supProdErr.message);
              continue;
            }
          } else {
            const { error: supProdErr } = await supabase
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
          imported.push(row.row_number);`;

if (supProdUpPattern.test(code)) {
  code = code.replace(supProdUpPattern, supProdReplacement);
  console.log("OK: replaced supplier_products upsert");
} else {
  console.log("WARN: supplier_products upsert regex not matched");
}

// Verify no onConflict remains
const remaining = (code.match(/onConflict/g) || []).length;
console.log("Remaining onConflict references: " + remaining);

fs.writeFileSync(path, code, "utf-8");
console.log("DONE: file written");
