"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  MapPin,
  MessageSquare,
  FileText,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageHeader from "@/components/layout/page-header";
import Avatar from "@/components/ui/avatar";
<<<<<<< HEAD
import StatusBadge from "@/components/ui/status-badge";
import Button from "@/components/ui/button";
=======
>>>>>>> 8726d9e4931e010174f6e1fba5b8f6c05e70902c
import Pagination, { usePagination } from "@/components/ui/pagination";
import { createClient } from "@/lib/supabase/browser";
import { formatTimeAgo } from "@/lib/utils";

type Tab = "overview" | "projects" | "communications" | "invoices" | "activity";

/* ── DB row types ────────────────────────────── */
interface DbClient {
  id: string;
  name: string;
  company: string | null;
  industry: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  assigned_to: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

interface DbProject {
  id: string;
  name: string;
  type: string | null;
  status: string | null;
  value: string | null;
  end_date: string | null;
  client_id: string;
  assigned_to: string | null;
}

interface DbConversation {
  id: string;
  contact_name: string | null;
  channel: string | null;
  status: string | null;
  last_message_at: string | null;
  client_id: string;
}

interface DbInvoice {
  id: string;
  invoice_number: string | null;
  amount: number | null;
  status: string | null;
  issued_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  client_id: string;
}

const tabItems: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "projects", label: "Projects" },
  { key: "communications", label: "Communications" },
  { key: "invoices", label: "Invoices" },
  { key: "activity", label: "Activity" },
];

function statusBadgeClass(status: string | null): string {
  if (!status) return "pm-dash-bdg-n";
  const s = status.toLowerCase();
  if (s === "active" || s === "paid" || s === "completed" || s === "available" || s === "open")
    return "pm-dash-bdg-g";
  if (s === "review" || s === "pending" || s === "in_progress" || s === "in progress")
    return "pm-dash-bdg-y";
  if (s === "overdue" || s === "cancelled" || s === "inactive" || s === "archived")
    return "pm-dash-bdg-r";
  if (s === "draft" || s === "closed") return "pm-dash-bdg-n";
  return "pm-dash-bdg-b";
}

function statusDotColor(status: string | null): string {
  if (!status) return "bg-gray-5";
  const s = status.toLowerCase();
  if (s === "active" || s === "paid" || s === "completed" || s === "open") return "bg-green";
  if (s === "in_progress" || s === "in progress" || s === "review" || s === "pending") return "bg-yellow";
  return "bg-gray-5";
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return "KES —";
  const num = amount ?? 0;
  if (num >= 1_000_000) return `KES ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `KES ${(num / 1_000).toFixed(0)}K`;
  return `KES ${amount.toLocaleString()}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-KE", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function ownerDisplay(assignedTo: string | null): { name: string; initials: string } {
  if (!assignedTo) return { name: "Unassigned", initials: "UA" };
  const name = assignedTo
    .split("@")[0]
    .replace(".", " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return { name, initials };
}

/* ── Activity item (derived from conversations + invoices + projects) ───── */
interface ActivityItem {
  id: string;
  action: string;
  detail: string;
  time: string;
  rawTime: string;
  user: string;
}

export default function ClientDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [client, setClient] = useState<DbClient | null>(null);
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [invoices, setInvoices] = useState<DbInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [invoicePage, setInvoicePage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);

  /* ── Derived activity from conversations + invoices + projects ──── */
  const activity: ActivityItem[] = React.useMemo(() => {
    const items: ActivityItem[] = [];

    conversations.forEach((c) => {
      items.push({
        id: `conv-${c.id}`,
        action: "Communication",
        detail: `${c.channel || "Unknown"} with ${c.contact_name || "Unknown"}`,
        time: c.last_message_at ? formatTimeAgo(c.last_message_at) : "",
        rawTime: c.last_message_at || "",
        user: (c.contact_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
      });
    });

    invoices.forEach((inv) => {
      items.push({
        id: `inv-${inv.id}`,
        action: `Invoice ${inv.status || "created"}`,
        detail: `${inv.invoice_number || inv.id.slice(0, 8)} · ${formatCurrency(inv.amount)}`,
        time: inv.issued_date ? formatTimeAgo(inv.issued_date) : "",
        rawTime: inv.issued_date || "",
        user: "SYS",
      });
    });

    projects.forEach((p) => {
      items.push({
        id: `proj-${p.id}`,
        action: "Project",
        detail: `${p.name} (${p.status || "draft"})`,
        time: p.end_date ? formatTimeAgo(p.end_date) : "",
        rawTime: p.end_date || "",
        user: (p.assigned_to || "?").split("@")[0]?.slice(0, 2).toUpperCase() || "SY",
      });
    });

    items.sort((a, b) => {
      if (!a.rawTime || !b.rawTime) return 0;
      return b.rawTime.localeCompare(a.rawTime);
    });

    return items;
  }, [conversations, invoices, projects]);

  const { paginated: paginatedInvoices, total: totalInvoices } = usePagination(invoices, invoicePage, 20);
  const { paginated: paginatedActivity, total: totalActivity } = usePagination(activity, activityPage, 20);

  /* ── Fetch client data ──────────────────────── */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const supabase = createClient();

        const { data: clientData, error: clientErr } = await supabase
          .from("clients")
          .select("*")
          .eq("id", id)
          .single();

        if (cancelled) return;
        if (clientErr || !clientData) {
          setError("Client not found.");
          setLoading(false);
          return;
        }
        setClient(clientData as DbClient);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load client");
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  /* ── Fetch tab-specific data ─────────────────── */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const supabase = createClient();

    if (activeTab === "overview" || activeTab === "projects") {
      supabase
        .from("projects")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (!cancelled && data) setProjects(data as DbProject[]);
        });
    }

    if (activeTab === "overview" || activeTab === "communications") {
      supabase
        .from("conversations")
        .select("*")
        .eq("client_id", id)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .then(({ data }) => {
          if (!cancelled && data) setConversations(data as DbConversation[]);
        });
    }

    if (activeTab === "overview" || activeTab === "invoices" || activeTab === "activity") {
      supabase
        .from("invoices")
        .select("*")
        .eq("client_id", id)
        .order("issued_date", { ascending: false })
        .then(({ data }) => {
          if (!cancelled && data) setInvoices(data as DbInvoice[]);
        });
    }

    return () => { cancelled = true; };
  }, [id, activeTab]);

  /* ── Loading / Error states ──────────────────── */
  if (loading) {
    return (
      <div className="page-content">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={20} className="animate-spin text-yellow" />
          <span className="text-[13px] text-gray-5">Loading client…</span>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="page-content">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <span className="text-[13px] text-red">{error || "Client not found"}</span>
          <Link href="/app/clients" className="text-[12px] text-yellow hover:underline">
            ← Back to clients
          </Link>
        </div>
      </div>
    );
  }

  const c = client;
  const owner = ownerDisplay(c.assigned_to);
  const clientSince = formatDate(c.created_at);
  const activeProjectCount = projects.filter(
    (p) => p.status === "active" || p.status === "in_progress",
  ).length;
  const totalProjectValue = projects.reduce(
    (sum, p) => sum + (parseInt(String(p.value).replace(/[^0-9]/g, "")) || 0),
    0,
  );
  const totalInvoiceValue = invoices.reduce(
    (sum, inv) => sum + (inv.amount || 0),
    0,
  );

  return (
    <div className="page-content">
      <PageHeader
        title={c.company || c.name}
        subtitle={`${c.industry || "—"} · Client since ${clientSince}`}
        actions={
          <>
            <Link href="/app/clients">
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-medium rounded-full border border-[rgba(255,255,255,0.1)] text-gray-4 hover:text-white hover:border-white/20 transition-colors cursor-pointer">
                <ArrowLeft size={12} /> Back
              </button>
            </Link>
            <Link href={`/app/projects/new?client_id=${c.id}`}>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-medium rounded-full bg-yellow text-black hover:bg-yellow/90 transition-colors cursor-pointer">
                + New Project
              </button>
            </Link>
          </>
        }
      />

      {/* ── Tab Navigation ─────────────────────── */}
      <div className="px-7 py-3 flex items-center gap-1 border-b border-[#1E1E1E]">
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-[12px] px-4 py-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.key
                ? "text-yellow border-yellow"
                : "text-gray-4 border-transparent hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

<<<<<<< HEAD
      <div className="pm-dash-card pm-dash-card-b">
        {activeTab === "overview" && (
          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2 space-y-5">
              <div className="pm-dash-card p-5">
                <h3 className="font-display text-[13px] font-semibold mb-4">
                  Company Info
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2.5">
                    <MapPin size={13} className="text-gray-5" />
                    <span className="text-[12px] text-gray-3">
                      {c.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Globe size={13} className="text-gray-5" />
                    <span className="text-[12px] text-gray-3">{c.website}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail size={13} className="text-gray-5" />
                    <span className="text-[12px] text-gray-3">{c.email}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone size={13} className="text-gray-5" />
                    <span className="text-[12px] text-gray-3">{c.phone}</span>
                  </div>
                </div>
              </div>
              <div className="pm-dash-card p-5">
                <h3 className="font-display text-[13px] font-semibold mb-4">
                  Active Projects
                </h3>
                <div className="space-y-3">
                  {c.projects.map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between py-2 border-b border-[#1E1E1E] last:border-0"
                    >
                      <div>
                        <div className="text-[12px] font-semibold text-white">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-gray-5 mt-0.5">
                          {p.type} · Due {p.deadline}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display text-[11px] font-bold text-yellow">
                          {p.value}
=======
      <div className="p-7">
        {/* ═══════════════════════════════════════════ OVERVIEW ═══════ */}
        {activeTab === "overview" && (
          <>
            {/* ── KPI Row ────────────────────────── */}
            <div className="pm-dash-krow pm-dash-krow-4 mb-5">
              <div className="pm-dash-kcard">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-3.5 h-3.5 text-gray-5" />
                  <span className="pm-dash-kl">Projects</span>
                </div>
                <div className="pm-dash-kn">{activeProjectCount}</div>
                <div className="pm-dash-ksub">{projects.length} total</div>
              </div>
              <div className="pm-dash-kcard grn">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-3.5 h-3.5 text-green" />
                  <span className="pm-dash-kl">Conversations</span>
                </div>
                <div className="pm-dash-kn grn">{conversations.length}</div>
                <div className="pm-dash-ksub">
                  {conversations.filter((cv) => cv.status === "open").length} open
                </div>
              </div>
              <div className="pm-dash-kcard">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-3.5 h-3.5 text-yellow" />
                  <span className="pm-dash-kl">Invoices</span>
                </div>
                <div className="pm-dash-kn">{invoices.length}</div>
                <div className="pm-dash-ksub">
                  {invoices.filter((i) => i.status === "overdue").length} overdue
                </div>
              </div>
              <div className="pm-dash-kcard blu">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-3.5 h-3.5 text-blue" />
                  <span className="pm-dash-kl">Total Value</span>
                </div>
                <div className="pm-dash-kn blu">{formatCurrency(totalProjectValue)}</div>
                <div className="pm-dash-ksub">{formatCurrency(totalInvoiceValue)} invoiced</div>
              </div>
            </div>

            {/* ── Two-column grid ────────────────── */}
            <div className="grid grid-cols-3 gap-5">
              <div className="col-span-2 space-y-5">
                {/* Company Info */}
                <div className="pm-dash-card">
                  <div className="pm-dash-card-h">
                    <span className="pm-dash-card-t text-[16px]">Company Info</span>
                    <span className={`pm-dash-bdg ${statusBadgeClass(c.status)}`}>
                      {(c.status || "active").toUpperCase()}
                    </span>
                  </div>
                  <div className="pm-dash-card-b">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2.5">
                        <MapPin size={13} className="text-gray-5" />
                        <span className="text-[12px] text-gray-3">
                          {c.industry || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Globe size={13} className="text-gray-5" />
                        <span className="text-[12px] text-gray-3">
                          {c.website || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Mail size={13} className="text-gray-5" />
                        <span className="text-[12px] text-gray-3">
                          {c.email || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Phone size={13} className="text-gray-5" />
                        <span className="text-[12px] text-gray-3">
                          {c.phone || "—"}
>>>>>>> 8726d9e4931e010174f6e1fba5b8f6c05e70902c
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
<<<<<<< HEAD
              </div>
              <div className="pm-dash-card p-5">
                <h3 className="font-display text-[13px] font-semibold mb-4">
                  Recent Communications
                </h3>
                <div className="space-y-3">
                  {c.communications.map((comm, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-[#1E1E1E] last:border-0"
=======

                {/* Active Projects */}
                <div className="pm-dash-card">
                  <div className="pm-dash-card-h">
                    <span className="pm-dash-card-t text-[16px]">Active Projects</span>
                    <Link
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab("projects");
                      }}
                      className="text-[10px] text-yellow hover:underline"
>>>>>>> 8726d9e4931e010174f6e1fba5b8f6c05e70902c
                    >
                      View all
                    </Link>
                  </div>
                  <div className="pm-dash-card-b">
                    {projects.length === 0 ? (
                      <p className="text-[12px] text-gray-5 py-4">No projects yet.</p>
                    ) : (
                      <div className="space-y-0">
                        {projects.slice(0, 5).map((p) => (
                          <div key={p.id} className="pm-dash-li">
                            <div className={`pm-dash-li-dot ${statusDotColor(p.status)}`} />
                            <div className="pm-dash-li-body">
                              <div className="pm-dash-li-title">{p.name}</div>
                              <div className="pm-dash-li-meta">
                                {p.type || "—"} · Due {formatDate(p.end_date)}
                              </div>
                            </div>
                            <span className={`pm-dash-bdg ${statusBadgeClass(p.status)}`}>
                              {(p.status || "draft").toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
<<<<<<< HEAD
                      <span className="text-[10px] text-gray-5">
                        {comm.date}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-5">
              <div className="pm-dash-card p-5">
                <h3 className="font-display text-[13px] font-semibold mb-4">
                  Account Details
                </h3>
                <div className="space-y-3.5">
                  <div>
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Status
                    </div>
                    <StatusBadge variant={c.status}>{c.status}</StatusBadge>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Account Owner
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar
                        initials={c.ownerInitials}
                        variant="yellow"
                        size="sm"
                      />
                      <span className="text-[12px] text-gray-3">{c.owner}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Total Value
                    </div>
                    <span className="font-display text-[18px] font-bold text-yellow">
                      {c.totalValue}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Active Projects
                    </div>
                    <span className="font-display text-[18px] font-bold text-white">
                      {c.activeProjects}
                    </span>
                  </div>
                </div>
              </div>
              <div className="pm-dash-card p-5">
                <h3 className="font-display text-[13px] font-semibold mb-4">
                  Recent Invoices
                </h3>
                <div className="space-y-3">
                  {c.invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between py-1.5"
                    >
                      <div>
                        <div className="text-[11px] text-gray-3">{inv.id}</div>
                        <div className="text-[10px] text-gray-5">
                          {inv.date}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-semibold text-white">
                          {inv.amount}
                        </div>
                        <div
                          className={`text-[9px] font-mono font-bold ${inv.status === "Paid" ? "text-green" : inv.status === "Overdue" ? "text-red" : "text-yellow"}`}
                        >
                          {inv.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "projects" && (
          <div className="grid grid-cols-2 gap-4">
            {c.projects.map((p) => (
              <div key={p.name} className="pm-dash-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-[13px] font-semibold">
                    {p.name}
                  </span>
                  <StatusBadge variant={p.status}>{p.status}</StatusBadge>
                </div>
                <div className="text-[11px] text-gray-5 mb-3">{p.type}</div>
                <div className="flex items-center justify-between pt-2 border-t border-[#1E1E1E]">
                  <span className="text-[11px] text-gray-5">
                    Due {p.deadline}
                  </span>
                  <span className="font-display text-[11px] font-bold text-yellow">
                    {p.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "communications" && (
          <div className="pm-dash-card p-5">
            <div className="space-y-4">
              {c.communications.map((comm, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 py-3 border-b border-[#1E1E1E] last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-black-4 flex items-center justify-center text-[10px] font-mono text-yellow flex-shrink-0">
                    {comm.type[0]}
                  </div>
                  <div className="flex-1">
                    <div className="text-[12px] text-white font-semibold">
                      {comm.subject}
                    </div>
                    <div className="text-[10px] text-gray-5 mt-0.5">
                      {comm.with_}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-5 flex-shrink-0">
                    {comm.date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "invoices" && (
          <div className="pm-dash-card p-5">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-mono text-gray-5 uppercase tracking-wider border-b border-[#1E1E1E]">
                  <th className="text-left py-2.5 font-medium">Invoice</th>
                  <th className="text-left py-2.5 font-medium">Date</th>
                  <th className="text-right py-2.5 font-medium">Amount</th>
                  <th className="text-right py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[#1A1A1A]">
                    <td className="py-3 text-[12px] text-white font-semibold">
                      {inv.id}
                    </td>
                    <td className="py-3 text-[12px] text-gray-4">{inv.date}</td>
                    <td className="py-3 text-right font-display text-[12px] font-semibold text-yellow">
                      {inv.amount}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          inv.status === "Paid"
                            ? "bg-green/10 text-green border-green/20"
                            : inv.status === "Overdue"
                              ? "bg-red/10 text-red border-red/20"
                              : "bg-yellow/10 text-yellow border-yellow/20"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={invoicePage} pageSize={20} total={totalInvoices} onPageChange={setInvoicePage} />
          </div>
        )}

        {activeTab === "activity" && (
          <div className="pm-dash-card p-5">
            <div className="space-y-0">
              {paginatedActivity.map((a, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-3 border-b border-[#1E1E1E] last:border-0"
                >
                  <div className="flex flex-col items-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-yellow flex-shrink-0" />
                    {i < paginatedActivity.length - 1 && (
                      <div className="w-px h-full bg-[#1E1E1E] mt-1" />
=======
>>>>>>> 8726d9e4931e010174f6e1fba5b8f6c05e70902c
                    )}
                  </div>
                </div>

                {/* Recent Communications */}
                <div className="pm-dash-card">
                  <div className="pm-dash-card-h">
                    <span className="pm-dash-card-t text-[16px]">Recent Communications</span>
                    <Link
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab("communications");
                      }}
                      className="text-[10px] text-yellow hover:underline"
                    >
                      View all
                    </Link>
                  </div>
                  <div className="pm-dash-card-b">
                    {conversations.length === 0 ? (
                      <p className="text-[12px] text-gray-5 py-4">No communications yet.</p>
                    ) : (
                      <div className="space-y-0">
                        {conversations.slice(0, 5).map((conv) => (
                          <div key={conv.id} className="pm-dash-li">
                            <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[10px] font-mono text-yellow flex-shrink-0">
                              {(conv.channel || "M")[0].toUpperCase()}
                            </div>
                            <div className="pm-dash-li-body">
                              <div className="pm-dash-li-title">
                                {conv.contact_name || "Unknown contact"}
                              </div>
                              <div className="pm-dash-li-meta">
                                {conv.channel || "message"} · {conv.status || "open"}
                              </div>
                            </div>
                            <span className="text-[10px] text-gray-5 flex-shrink-0">
                              {conv.last_message_at ? formatTimeAgo(conv.last_message_at) : "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Right sidebar ──────────────────── */}
              <div className="space-y-5">
                {/* Account Details */}
                <div className="pm-dash-card">
                  <div className="pm-dash-card-h">
                    <span className="pm-dash-card-t text-[16px]">Account Details</span>
                  </div>
                  <div className="pm-dash-card-b space-y-4">
                    <div>
                      <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-1">
                        Status
                      </div>
                      <span className={`pm-dash-bdg ${statusBadgeClass(c.status)}`}>
                        {(c.status || "active").toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-1">
                        Account Owner
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar initials={owner.initials} variant="yellow" size="sm" />
                        <span className="text-[12px] text-gray-3">{owner.name}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-1">
                        Total Project Value
                      </div>
                      <span className="pm-dash-kn text-[18px] grn">
                        {formatCurrency(totalProjectValue)}
                      </span>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-1">
                        Active Projects
                      </div>
                      <span className="pm-dash-kn text-[18px]">
                        {activeProjectCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Invoices */}
                <div className="pm-dash-card">
                  <div className="pm-dash-card-h">
                    <span className="pm-dash-card-t text-[16px]">Recent Invoices</span>
                    <Link
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab("invoices");
                      }}
                      className="text-[10px] text-yellow hover:underline"
                    >
                      View all
                    </Link>
                  </div>
                  <div className="pm-dash-card-b">
                    {invoices.length === 0 ? (
                      <p className="text-[12px] text-gray-5 py-4">No invoices yet.</p>
                    ) : (
                      <div className="space-y-0">
                        {invoices.slice(0, 3).map((inv) => (
                          <div key={inv.id} className="pm-dash-li">
                            <div className="pm-dash-li-body">
                              <div className="pm-dash-li-title">
                                {inv.invoice_number || inv.id.slice(0, 8)}
                              </div>
                              <div className="pm-dash-li-meta">
                                {formatDate(inv.issued_date)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[11px] font-semibold text-yellow">
                                {formatCurrency(inv.amount)}
                              </div>
                              <span className={`pm-dash-bdg ${statusBadgeClass(inv.status)}`}>
                                {(inv.status || "draft").toUpperCase()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
<<<<<<< HEAD
            <Pagination page={activityPage} pageSize={20} total={totalActivity} onPageChange={setActivityPage} />
=======
          </>
        )}

        {/* ═══════════════════════════════════════════ PROJECTS ═══════ */}
        {activeTab === "projects" && (
          <div className="grid grid-cols-2 gap-4">
            {projects.length === 0 ? (
              <div className="col-span-2 py-16 text-center text-[13px] text-gray-5">
                No projects for this client yet.
              </div>
            ) : (
              projects.map((p) => {
                const projectOwner = ownerDisplay(p.assigned_to);
                return (
                  <div key={p.id} className="pm-dash-card">
                    <div className="pm-dash-card-h">
                      <span className="pm-dash-card-t text-[14px]">{p.name}</span>
                      <span className={`pm-dash-bdg ${statusBadgeClass(p.status)}`}>
                        {(p.status || "draft").toUpperCase()}
                      </span>
                    </div>
                    <div className="pm-dash-card-b">
                      <div className="text-[11px] text-gray-5 mb-3">
                        {p.type || "—"}
                      </div>
                      {p.assigned_to && (
                        <div className="flex items-center gap-2 mb-3">
                          <Avatar initials={projectOwner.initials} variant="yellow" size="sm" />
                          <span className="text-[11px] text-gray-3">{projectOwner.name}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.04)]">
                        <span className="text-[11px] text-gray-5">
                          Due {formatDate(p.end_date)}
                        </span>
                        <span className="font-display text-[11px] font-bold text-yellow">
                          {formatCurrency(parseInt(String(p.value).replace(/[^0-9]/g, "")) || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════ COMMUNICATIONS ═══════ */}
        {activeTab === "communications" && (
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[16px]">Communications</span>
              <span className="pm-dash-bdg pm-dash-bdg-b">
                {conversations.length} total
              </span>
            </div>
            <div className="pm-dash-card-b">
              {conversations.length === 0 ? (
                <p className="text-[12px] text-gray-5 py-4">
                  No communications recorded for this client.
                </p>
              ) : (
                <div className="space-y-0">
                  {conversations.map((conv) => (
                    <div key={conv.id} className="pm-dash-li">
                      <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[10px] font-mono text-yellow flex-shrink-0">
                        {(conv.channel || "M")[0].toUpperCase()}
                      </div>
                      <div className="pm-dash-li-body">
                        <div className="pm-dash-li-title">
                          {conv.contact_name || "Unknown contact"}
                        </div>
                        <div className="pm-dash-li-meta">
                          {conv.channel || "message"} · {conv.status || "open"}
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-5 flex-shrink-0">
                        {conv.last_message_at
                          ? formatTimeAgo(conv.last_message_at)
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════ INVOICES ═══════ */}
        {activeTab === "invoices" && (
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[16px]">Invoices</span>
              <span className="pm-dash-bdg pm-dash-bdg-b">
                {invoices.length} total
              </span>
            </div>
            <div className="pm-dash-card-b-0">
              {invoices.length === 0 ? (
                <p className="text-[12px] text-gray-5 py-4 px-5">
                  No invoices for this client yet.
                </p>
              ) : (
                <>
                  <table className="pm-dash-tbl w-full">
                    <thead>
                      <tr>
                        <th className="pm-dash-tbl-th">Invoice</th>
                        <th className="pm-dash-tbl-th">Issued</th>
                        <th className="pm-dash-tbl-th">Due</th>
                        <th className="pm-dash-tbl-th text-right">Amount</th>
                        <th className="pm-dash-tbl-th text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedInvoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="pm-dash-tbl-td text-white font-semibold">
                            {inv.invoice_number || inv.id.slice(0, 8)}
                          </td>
                          <td className="pm-dash-tbl-td">
                            {formatDate(inv.issued_date)}
                          </td>
                          <td className="pm-dash-tbl-td">
                            {formatDate(inv.due_date)}
                          </td>
                          <td className="pm-dash-tbl-td text-right font-display font-semibold text-yellow">
                            {formatCurrency(inv.amount)}
                          </td>
                          <td className="pm-dash-tbl-td text-right">
                            <span className={`pm-dash-bdg ${statusBadgeClass(inv.status)}`}>
                              {(inv.status || "draft").toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-5 py-3">
                    <Pagination
                      page={invoicePage}
                      pageSize={20}
                      total={totalInvoices}
                      onPageChange={setInvoicePage}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════ ACTIVITY ═══════ */}
        {activeTab === "activity" && (
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[16px]">Activity</span>
              <span className="pm-dash-bdg pm-dash-bdg-n">
                {activity.length} events
              </span>
            </div>
            <div className="pm-dash-card-b">
              {activity.length === 0 ? (
                <p className="text-[12px] text-gray-5 py-4">
                  No activity recorded for this client yet.
                </p>
              ) : (
                <div className="space-y-0">
                  {paginatedActivity.map((a, i) => (
                    <div key={a.id} className="pm-dash-li">
                      <div className="flex flex-col items-center mt-1">
                        <div className="w-2 h-2 rounded-full bg-yellow flex-shrink-0" />
                        {i < paginatedActivity.length - 1 && (
                          <div className="w-px h-full bg-[rgba(255,255,255,0.04)] mt-1" />
                        )}
                      </div>
                      <div className="pm-dash-li-body">
                        <div className="text-[12px] text-white">
                          <span className="font-semibold">{a.action}</span>
                          <span className="text-gray-4"> — {a.detail}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar initials={a.user} variant="dark" size="sm" />
                          <span className="text-[10px] text-gray-5">{a.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {activity.length > 0 && (
              <div className="px-5 pb-3">
                <Pagination
                  page={activityPage}
                  pageSize={20}
                  total={totalActivity}
                  onPageChange={setActivityPage}
                />
              </div>
            )}
>>>>>>> 8726d9e4931e010174f6e1fba5b8f6c05e70902c
          </div>
        )}
      </div>
    </div>
  );
}
