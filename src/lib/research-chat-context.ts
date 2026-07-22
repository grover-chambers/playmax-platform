import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

interface ChatContext {
  projectTitle: string;
  clientName: string | null;
  periodLabel: string;
  competition: { product: string; supplier: string; competitor: string; competitor_supplier: string; our_avg_price: number; competitor_avg_price: number }[];
  categories: { category: string; total_revenue: number; total_units: number; avg_unit_price: number }[];
  branches: { branch_name: string; top_products: { product: string; revenue: number }[] }[];
  consumer: { product: string; total_quantity: number; avg_qty_per_period: number; branches_present: number }[];
  supplyGaps: { product: string; branch: string; gap_status: string; gap: number }[];
}

export async function buildResearchContext(projectId: string, reportId?: string): Promise<{ context: string; structured: ChatContext | null }> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    },
  );

  const { data: project } = await supabase
    .from("research_projects")
    .select("id, client_id, metadata")
    .eq("id", projectId)
    .single();

  if (!project) {
    return { context: "Research project not found.", structured: null };
  }

  let selectedReportContent: string | null = null;
  if (reportId) {
    const { data: rep } = await supabase
      .from("reports")
      .select("title, content, storage_url")
      .eq("id", reportId)
      .single();
    if (rep) {
      selectedReportContent = rep.content || `[Report: ${rep.title} — see PDF at ${rep.storage_url}]`;
    }
  }

  const meta = (project.metadata as Record<string, unknown>) || {};
  const projectTitle = (meta.title as string) || "Market Analysis";
  let clientName: string | null = null;
  let periodLabel = "current period";

  if (project.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("name, company")
      .eq("id", project.client_id)
      .single();
    clientName = client?.company || client?.name || null;

    const { data: sharing } = await supabase
      .from("portal_analytics_sharing")
      .select("period_id")
      .eq("client_id", project.client_id)
      .eq("visible", true);

    const periodIds = [...new Set((sharing || []).map((s) => s.period_id))];

    if (periodIds.length > 0) {
      const { data: period } = await supabase
        .from("analytics_periods")
        .select("label")
        .in("id", periodIds)
        .order("end_date", { ascending: false })
        .limit(1)
        .single();
      periodLabel = period?.label || "current period";
    }
  }

  const [competitionRes, categoriesRes, branchesRes, consumerRes, supplyRes] = await Promise.all([
    supabase.from("v_competition_matrix").select("product_name, supplier, competitor_product, competitor_supplier, our_avg_price, competitor_avg_price").limit(20),
    supabase.from("v_category_analysis").select("category, total_revenue, total_units, avg_unit_price").order("total_revenue", { ascending: false }).limit(15),
    supabase.from("v_branch_analysis").select("branch_name, product_name, revenue, volume, rank").limit(60),
    supabase.from("v_consumer_behaviour").select("product_name, total_quantity, avg_qty_per_period, branches_present, total_revenue").order("total_revenue", { ascending: false }).limit(15),
    supabase.from("v_supply_demand_gap").select("product_name, branch_name, gap_status, gap").limit(20),
  ]);

  const competition = (competitionRes.data || []).map((r: Record<string, unknown>) => ({
    product: r.product_name as string, supplier: r.supplier as string, competitor: r.competitor_product as string,
    competitor_supplier: r.competitor_supplier as string,
    our_avg_price: Number(r.our_avg_price) || 0, competitor_avg_price: Number(r.competitor_avg_price) || 0,
  }));

  const categories = (categoriesRes.data || []).map((r) => ({
    category: r.category, total_revenue: Number(r.total_revenue) || 0,
    total_units: Number(r.total_units) || 0, avg_unit_price: Number(r.avg_unit_price) || 0,
  }));

  const branchMap = new Map<string, { product: string; revenue: number }[]>();
  for (const r of branchesRes.data || []) {
    if (!branchMap.has(r.branch_name)) branchMap.set(r.branch_name, []);
    const prods = branchMap.get(r.branch_name)!;
    if (prods.length < 5) prods.push({ product: r.product_name, revenue: Number(r.revenue) || 0 });
  }
  const branches = Array.from(branchMap.entries()).map(([branch_name, top_products]) => ({ branch_name, top_products }));

  const consumer = (consumerRes.data || []).map((r) => ({
    product: r.product_name, total_quantity: Number(r.total_quantity) || 0,
    avg_qty_per_period: Number(r.avg_qty_per_period) || 0, branches_present: Number(r.branches_present) || 0,
  }));

  const supplyGaps = (supplyRes.data || []).map((r) => ({
    product: r.product_name, branch: r.branch_name, gap_status: r.gap_status, gap: Number(r.gap) || 0,
  }));

  const parts: string[] = [];
  if (selectedReportContent) {
    parts.push(`Selected report:\n${selectedReportContent}`);
  }
  parts.push(`Project: ${projectTitle}${clientName ? ` (Client: ${clientName})` : ""}`);

  if (competition.length > 0) {
    parts.push("\nCompetition Matrix:\n" + competition.map((c) =>
      `  ${c.product} (${c.supplier}) vs ${c.competitor} (${c.competitor_supplier}) — our price KES ${c.our_avg_price.toFixed(0)}, competitor KES ${c.competitor_avg_price.toFixed(0)}`
    ).join("\n"));
  }

  if (categories.length > 0) {
    const totalRev = categories.reduce((s, c) => s + c.total_revenue, 0);
    parts.push("\nCategory Performance:\n" + categories.map((c) =>
      `  ${c.category}: KES ${(c.total_revenue / 1000).toFixed(0)}K (${c.total_units} units, avg KES ${c.avg_unit_price.toFixed(0)}/unit) — ${totalRev > 0 ? ((c.total_revenue / totalRev) * 100).toFixed(1) : "0"}% share`
    ).join("\n"));
  }

  if (branches.length > 0) {
    parts.push("\nBranch Performance:\n" + branches.map((b) =>
      `  ${b.branch_name}: top products — ${b.top_products.map((p) => `${p.product} (KES ${(p.revenue / 1000).toFixed(0)}K)`).join(", ")}`
    ).join("\n"));
  }

  if (supplyGaps.length > 0) {
    const issues = supplyGaps.filter((g) => g.gap_status !== "BALANCED").slice(0, 10);
    if (issues.length > 0) {
      parts.push("\nSupply/Demand Issues:\n" + issues.map((g) =>
        `  ${g.product} at ${g.branch}: ${g.gap_status} (gap: ${g.gap} units)`
      ).join("\n"));
    }
  }

  if (consumer.length > 0) {
    parts.push("\nConsumer Behaviour (top products by revenue):\n" + consumer.slice(0, 8).map((c) =>
      `  ${c.product}: ${c.total_quantity} units, avg ${c.avg_qty_per_period.toFixed(1)}/period, ${c.branches_present} branches`
    ).join("\n"));
  }

  const context = parts.join("\n\n") || "No analytics data available for this project.";
  const structured: ChatContext = {
    projectTitle, clientName, periodLabel,
    competition, categories, branches, consumer, supplyGaps,
  };

  return { context, structured };
}
