import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeProducts = searchParams.get("include_products") === "true";

    const baseQueries = [
      supabase
        .from("analytics_branches")
        .select("*")
        .eq("active", true)
        .order("code"),
      supabase
        .from("analytics_categories")
        .select("*")
        .order("name"),
      supabase
        .from("analytics_subcategories")
        .select("id, category_id, name")
        .order("name"),
      supabase
        .from("analytics_manufacturers")
        .select("*")
        .order("name"),
      supabase
        .from("analytics_products")
        .select("id", { count: "exact", head: true }),
    ];

    const [branchesRes, categoriesRes, subcategoriesRes, manufacturersRes, productCountRes] =
      await Promise.all(baseQueries);

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
    if (manufacturersRes.error)
      return NextResponse.json(
        { error: sanitizeError(manufacturersRes.error) },
        { status: 500 },
      );

    const result: Record<string, unknown> = {
      branches: branchesRes.data ?? [],
      categories: categoriesRes.data ?? [],
      subcategories: subcategoriesRes.data ?? [],
      manufacturers: manufacturersRes.data ?? [],
      productCount: productCountRes.count ?? 0,
    };

    if (includeProducts) {
      const { data: products, error: prodErr } = await supabase
        .from("analytics_products")
        .select("id, stock_code, name, category_id, manufacturer_id, sub_category, unit_of_measure, active, created_at")
        .order("name");

      if (!prodErr && products) {
        // Enrich with category and manufacturer names
        const catIds = [...new Set(products.map((p: { category_id: string | null }) => p.category_id).filter(Boolean))];
        const mfgIds = [...new Set(products.map((p: { manufacturer_id: string | null }) => p.manufacturer_id).filter(Boolean))];

        const [catRes, mfgRes] = await Promise.all([
          catIds.length > 0
            ? supabase.from("analytics_categories").select("id, name").in("id", catIds)
            : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
          mfgIds.length > 0
            ? supabase.from("analytics_manufacturers").select("id, name").in("id", mfgIds)
            : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
        ]);

        const catMap = new Map((catRes.data ?? []).map((c) => [c.id, c.name]));
        const mfgMap = new Map((mfgRes.data ?? []).map((m) => [m.id, m.name]));

        result.products = products.map((p: Record<string, unknown>) => ({
          ...p,
          category_name: catMap.get(p.category_id as string) ?? "Unknown",
          manufacturer_name: mfgMap.get(p.manufacturer_id as string) ?? "Unknown",
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
