const fs = require("fs");
const filePath = "C:/PLAYMAX/playmax-platform-master with analytical changes/playmax-platform/src/app/api/analytics/uploads/[id]/import/route.ts";
let code = fs.readFileSync(filePath, "utf-8");

// 4. Products upsert — simpler pattern
const prodOld = `const { error: prodErr } = await supabase.from("analytics_products").upsert(
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
          imported.push(row.row_number);`;

const prodNew = `// Check for existing product
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

if (code.includes(prodOld)) {
  code = code.replace(prodOld, prodNew);
  console.log("OK: replaced products upsert");
} else {
  console.log("FAIL: products upsert not found");
}

// 5. Supplier products upsert
const supProdOld = `const { error: supProdErr } = await supabase.from("analytics_supplier_products").upsert(
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
          imported.push(row.row_number);`;

const supProdNew = `// Check for existing supplier-product link
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

if (code.includes(supProdOld)) {
  code = code.replace(supProdOld, supProdNew);
  console.log("OK: replaced supplier_products upsert");
} else {
  console.log("FAIL: supplier_products upsert not found");
}

// Verify
const remaining = (code.match(/onConflict/g) || []).length;
console.log("Remaining onConflict references: " + remaining);

fs.writeFileSync(filePath, code, "utf-8");
console.log("DONE");
