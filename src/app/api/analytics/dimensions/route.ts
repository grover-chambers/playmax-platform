import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Use the user's OWN authenticated client. RLS (migrations 071/072) now
    // grants super_admin + data_handler read access to all analytics tables,
    // so this works regardless of whether SUPABASE_SERVICE_ROLE_KEY is set on
    // the deployed (Vercel) environment. Role-less → fail closed.
    if (!currentUser.role) {
      return NextResponse.json({ error: "Forbidden — no role" }, { status: 403 });
    }

    const db = supabase;

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
