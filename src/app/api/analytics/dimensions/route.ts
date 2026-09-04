import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { getAdminClient } from "@/lib/supabase/admin";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const STAFF_ROLES = ["super_admin", "cms_admin", "crm_admin", "crm_staff", "finance", "data_handler"] as const;
    if (!(STAFF_ROLES as readonly string[]).includes(currentUser.role as string)) {
      return NextResponse.json({ error: "Forbidden — staff only" }, { status: 403 });
    }

    // Data handler shares the same analytics DB — use service role to bypass RLS that was is_admin-only before 053
    const db = getAdminClient();

    const { searchParams } = new URL(request.url);
    const includeProducts = searchParams.get("include_products") === "true";

    const baseQueries = [
      db
        .from("analytics_branches")
        .select("*")
        .eq("active", true)
        .order("code"),
      db
        .from("analytics_categories")
        .select("*")
        .order("name"),
      db
        .from("analytics_subcategories")
        .select("id, category_id, name")
        .order("name"),
      db
        .from("analytics_suppliers")
        .select("*")
        .eq("active", true)
        .order("name"),
      db
        .from("analytics_products")
        .select("id", { count: "exact", head: true }),
    ];

    const [
      branchesRes,
      categoriesRes,
      subcategoriesRes,
      suppliersRes,
      productCountRes,
    ] = await Promise.all(baseQueries);

    if (branchesRes.error)
      return NextResponse.json(
        { error: sanitizeError(branchesRes.error) },
        { status: 500 },
      );
    if (categoriesRes.error)
      return NextResponse.json(
        { error: sanitizeError(categoriesRes.error) },
        { status: 500 },
      );
    if (suppliersRes.error)
      return NextResponse.json(
        { error: sanitizeError(suppliersRes.error) },
        { status: 500 },
      );

    const result: Record<string, unknown> = {
      branches: branchesRes.data ?? [],
      categories: categoriesRes.data ?? [],
      subcategories: subcategoriesRes.data ?? [],
      manufacturers: suppliersRes.data ?? [],
      suppliers: suppliersRes.data ?? [],
      productCount: productCountRes.count ?? 0,
    };

    if (includeProducts) {
      const { data: products, error: prodErr } = await db
        .from("analytics_products")
        .select("id, stock_code, name, category_id, default_supplier_id, sub_category, unit_of_measure, active, created_at")
        .order("name");

      if (!prodErr && products) {
        const catIds = [...new Set(products.map((p: { category_id: string | null }) => p.category_id).filter(Boolean))];
        const supIds = [...new Set(products.map((p: { default_supplier_id: string | null }) => p.default_supplier_id).filter(Boolean))];

        const [catRes, supRes] = await Promise.all([
          catIds.length > 0
            ? db.from("analytics_categories").select("id, name").in("id", catIds)
            : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
          supIds.length > 0
            ? db.from("analytics_suppliers").select("id, name").in("id", supIds)
            : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
        ]);

        const catMap = new Map((catRes.data ?? []).map((c) => [c.id, c.name]));
        const supMap = new Map((supRes.data ?? []).map((m) => [m.id, m.name]));

        result.products = products.map((p: Record<string, unknown>) => ({
          ...p,
          category_name: catMap.get(p.category_id as string) ?? "Unknown",
          manufacturer_name: supMap.get(p.default_supplier_id as string) ?? "Unknown",
        }));
      }
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch dimensions" },
      { status: 500 },
    );
  }
}
