import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { requirePortalClient } from "@/lib/portal-guard";

export const dynamic = "force-dynamic";


export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    const portal = await requirePortalClient(supabase, currentUser);
    if (portal.response) return portal.response;
    const client = portal.client;

    const clientId = client.id;

    // Fetch all data in parallel
    const [projectsRes, invoicesRes, bookingsRes, conversationsRes, documentsRes] =
      await Promise.all([
        supabase
          .from("projects")
          .select("id, name, type, status, value, progress, start_date, end_date, created_at")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false }),
        supabase
          .from("invoices")
          .select("id, invoice_number, amount, status, issued_date, due_date, paid_date, project_id")
          .eq("client_id", clientId)
          .order("due_date", { ascending: false }),
        supabase
          .from("bookings")
          .select("id, inventory_id, start_date, end_date, status, total_price, inventory(name, location, type)")
          .eq("client_id", clientId)
          .order("start_date", { ascending: false }),
        supabase
          .from("conversations")
          .select("id, contact_name, channel, status, last_message_at")
          .eq("client_id", clientId)
          .order("last_message_at", { ascending: false, nullsFirst: false }),
        supabase
          .from("documents")
          .select("id, name, type, size, visible_to_client, created_at")
          .eq("client_id", clientId)
          .eq("visible_to_client", true)
          .order("created_at", { ascending: false }),
      ]);

    const projects = projectsRes.data || [];
    const invoices = invoicesRes.data || [];
    const bookings = bookingsRes.data || [];
    const conversations = conversationsRes.data || [];
    const documents = documentsRes.data || [];

    // Compute KPIs
    const activeProjects = projects.filter(p =>
      ["active", "in_progress", "review"].includes(p.status)
    ).length;

    const totalProjectValue = projects.reduce((sum, p) => sum + (Number(p.value) || 0), 0);

    const outstandingInvoices = invoices.filter(i =>
      ["draft", "sent", "overdue"].includes(i.status)
    );
    const outstandingAmount = outstandingInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const overdueCount = invoices.filter(i => i.status === "overdue").length;

    const activeBookings = bookings.filter(b =>
      ["pending", "confirmed"].includes(b.status)
    ).length;

    const openConversations = conversations.filter(c => c.status === "open").length;

    const pendingDeliverables = documents.filter(d => d.visible_to_client).length;

    return NextResponse.json({
      client: {
        name: client.name,
        company: client.company,
      },
      kpis: {
        activeProjects,
        totalProjects: projects.length,
        totalProjectValue,
        outstandingAmount,
        overdueInvoices: overdueCount,
        totalInvoices: invoices.length,
        activeBookings,
        totalBookings: bookings.length,
        openConversations,
        pendingDeliverables,
      },
      recentProjects: projects.slice(0, 3),
      recentInvoices: outstandingInvoices.slice(0, 3),
      recentBookings: bookings.filter(b => b.status !== "completed").slice(0, 3),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch overview" }, { status: 500 });
  }
}
