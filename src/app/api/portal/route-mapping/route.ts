import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { requirePortalClient } from "@/lib/portal-guard";
import { internalError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface MetricRow {
  metric_key: string;
  metric_label: string;
  metric_value: number;
  unit: string | null;
  chart_type: string | null;
  sort_order: number | null;
}

/**
 * Route Mapping module data for the client portal (access-overview spec §2:
 * "surface in the Route Mapping tab of Kanini's portal view").
 *
 * Serves the latest module_sync report + its metrics. Module activation is
 * enforced at ingest time; this read is additionally gated on an active
 * route_mapping activation so deactivated modules stop rendering.
 */
export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    const portal = await requirePortalClient(supabase, currentUser);
    if (portal.response) return portal.response;
    const client = portal.client;

    const { data: activation, error: activationError } = await supabase
      .from("client_modules")
      .select("id, status, updated_at")
      .eq("client_id", client.id)
      .eq("module_type", "route_mapping")
      .maybeSingle();

    if (activationError) {
      return internalError(activationError);
    }

    if (!activation || activation.status !== "active") {
      return NextResponse.json({ active: false });
    }

    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("id, title, type, updated_at, created_at")
      .eq("client_id", client.id)
      .eq("type", "module_sync")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reportError) {
      return internalError(reportError);
    }

    if (!report) {
      return NextResponse.json({ active: true, report: null, metrics: [] });
    }

    const { data: metrics, error: metricsError } = await supabase
      .from("report_metrics")
      .select(
        "metric_key, metric_label, metric_value, unit, chart_type, sort_order",
      )
      .eq("report_id", report.id)
      .order("sort_order", { ascending: true });

    if (metricsError) {
      return internalError(metricsError);
    }

    return NextResponse.json({
      active: true,
      module_updated_at: activation.updated_at,
      report,
      metrics: (metrics as MetricRow[]) || [],
    });
  } catch {
    return internalError(new Error("Failed to fetch route mapping data"));
  }
}
