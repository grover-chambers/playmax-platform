"use client";

import React, { useState, useEffect } from "react";
import Pagination, { usePagination } from "@/components/ui/pagination";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Eye, RotateCcw, Link, Loader2, CheckCircle, Clock, XCircle, MessageSquare } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import ConfirmActionModal from "@/components/modals/confirm-action-modal";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/browser";

/* ── Types ─────────────────────────────────────────────── */

interface WhatsAppTemplate {
  id: string;
  name: string;
  type: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

type TemplateDisplayStatus = "Approved" | "Pending" | "Rejected";

const STATUS_BADGE_MAP: Record<TemplateDisplayStatus, "active" | "review" | "draft"> = {
  Approved: "active",
  Pending: "review",
  Rejected: "draft",
};

/* ── Page ──────────────────────────────────────────────── */

export default function WhatsAppTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [wabaIdHidden, setWabaIdHidden] = useState(true);
  const [confirmAction, setConfirmAction] = useState<"rotate" | "reconnect" | null>(null);
  const [syncing, setSyncing] = useState(false);

  /* ── Load templates from Supabase ────────────────────── */

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("templates")
          .select("*")
          .eq("type", "whatsapp")
          .order("updated_at", { ascending: false });

        if (error) throw error;
        if (!cancelled) setTemplates(data ?? []);
      } catch {
        if (!cancelled) setTemplates([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  /* ── Derived data ────────────────────────────────────── */

  // For templates without a status field, infer from existence of content
  const getStatus = (t: WhatsAppTemplate): TemplateDisplayStatus => {
    if (t.content && t.content.length > 10) return "Approved";
    return "Pending";
  };

  const approvedCount = templates.filter((t) => getStatus(t) === "Approved").length;
  const pendingCount = templates.filter((t) => getStatus(t) === "Pending").length;
  const rejectedCount = templates.filter((t) => getStatus(t) === "Rejected").length;

  const displayTemplates = templates.map((t) => ({
    ...t,
    displayStatus: getStatus(t),
    lastSubmitted: t.updated_at ? new Date(t.updated_at).toISOString().split("T")[0] : "—",
  }));

  const { paginated, total } = usePagination(displayTemplates, page, 20);

  /* ── Sync handler (placeholder) ──────────────────────── */

  const handleSync = async () => {
    setSyncing(true);
    // In production, this would call a server action to sync with WhatsApp API
    await new Promise((r) => setTimeout(r, 1500));
    setSyncing(false);
    setRefreshKey(k => k + 1);
  };

  /* ── Loading state ───────────────────────────────────── */

  if (loading) {
    return (
      <div className="page-content">
        <PageHeader title="WhatsApp Templates" subtitle="Loading…" />
        <div className="flex items-center justify-center py-24 text-gray-5">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading templates…
        </div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────── */

  return (
    <div className="page-content">
      {/* Header */}
      <PageHeader
        title="WhatsApp Templates"
        subtitle={`${templates.length} template${templates.length !== 1 ? "s" : ""}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync Status"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push("/app/admin/whatsapp/submit")}
            >
              <Plus size={12} className="mr-1" /> Submit New Template
            </Button>
          </div>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="ws-stat-card">
          <div className="flex items-center gap-3">
            <div className="ws-stat-icon"><CheckCircle className="w-4 h-4 text-green" /></div>
            <div>
              <div className="ws-stat-value">{approvedCount}</div>
              <div className="ws-stat-label">Approved Templates</div>
            </div>
          </div>
        </div>
        <div className="ws-stat-card">
          <div className="flex items-center gap-3">
            <div className="ws-stat-icon"><Clock className="w-4 h-4 text-blue" /></div>
            <div>
              <div className="ws-stat-value">{pendingCount}</div>
              <div className="ws-stat-label">Pending Review</div>
            </div>
          </div>
        </div>
        <div className="ws-stat-card">
          <div className="flex items-center gap-3">
            <div className="ws-stat-icon"><XCircle className="w-4 h-4 text-red" /></div>
            <div>
              <div className="ws-stat-value">{rejectedCount}</div>
              <div className="ws-stat-label">Rejected</div>
            </div>
          </div>
        </div>
        <div className="ws-stat-card">
          <div className="flex items-center gap-3">
            <div className="ws-stat-icon"><MessageSquare className="w-4 h-4 text-teal" /></div>
            <div>
              <div className="ws-stat-value">{templates.length}</div>
              <div className="ws-stat-label">Total Templates</div>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Table */}
      <div className="ws-panel overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--ws-border)]">
              {["Template Name", "Type", "Status", "Last Updated", "Actions"].map((h) => (
                <th
                  key={h}
                  className="font-mono text-[11px] text-gray-5 font-semibold tracking-widest uppercase text-left px-4 py-3"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((tmpl) => (
              <tr
                key={tmpl.id}
                className="border-b border-[var(--ws-border)] hover:bg-[var(--ws-bg)] transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="font-display text-[13px] font-semibold">
                    {tmpl.name}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="intent-tag text-[9px]">{tmpl.type}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    variant={STATUS_BADGE_MAP[tmpl.displayStatus]}
                    className={
                      tmpl.displayStatus === "Rejected"
                        ? "text-red! border-red/20! bg-red/10!"
                        : ""
                    }
                  >
                    {tmpl.displayStatus}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3 text-[11px] text-gray-5 font-mono">
                  {tmpl.lastSubmitted}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="py-1! px-2.5! text-[10px] hover:bg-yellow/10! hover:text-yellow!"
                      title="Sync status with WhatsApp"
                      onClick={handleSync}
                    >
                      <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="py-1! px-2.5! text-[10px] hover:bg-white/10!"
                      title="View template details"
                      onClick={() => router.push("/app/admin/whatsapp/submit")}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {templates.length === 0 && (
          <div className="py-12 text-center text-[13px] text-gray-5">
            No WhatsApp templates yet. Submit your first template to get started.
          </div>
        )}
        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
      </div>

      {/* API Connection Status */}
      <div className="ws-panel p-6">
        <h3 className="font-display text-[15px] font-bold mb-4">
          API Connection Status
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-5 font-mono">WABA ID</span>
            <span className="text-[12px] font-mono text-[var(--ws-text)]">
              {wabaIdHidden ? "••••••••••" : "Not configured"}
              <button
                onClick={() => setWabaIdHidden((prev) => !prev)}
                className="ml-2 text-[10px] text-yellow hover:underline"
              >
                {wabaIdHidden ? "Show" : "Hide"}
              </button>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-5 font-mono">Phone Number</span>
            <span className="text-[12px] font-mono text-gray-5">
              Configure in Settings → Integrations
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-5 font-mono">Business Account Status</span>
            <span className="pm-dash-bdg pm-dash-bdg-n">Not Connected</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-5 pt-4 border-t border-[var(--ws-border)]">
          <Button variant="secondary" size="sm" onClick={() => setConfirmAction("rotate")}>
            <RotateCcw className="w-3 h-3 mr-1" /> Rotate API Key
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setConfirmAction("reconnect")}>
            <Link className="w-3 h-3 mr-1" /> Reconnect
          </Button>
        </div>

        <p className="text-[10px] text-gray-5 mt-4 leading-relaxed">
          WhatsApp Business API integration is not yet active. Configure your WABA credentials
          in Settings → Integrations to enable template submission and messaging.
        </p>
      </div>

      <ConfirmActionModal
        open={confirmAction === "rotate"}
        onClose={() => setConfirmAction(null)}
        title="Rotate API Key"
        message="This will invalidate the current API key. All services using this key will lose access until updated with the new key. Continue?"
        confirmLabel="Rotate Key"
      />

      <ConfirmActionModal
        open={confirmAction === "reconnect"}
        onClose={() => setConfirmAction(null)}
        title="Reconnect WhatsApp"
        message="This will attempt to re-establish the connection to WhatsApp Business API. Your current templates and settings will be preserved."
        confirmLabel="Reconnect"
      />
    </div>
  );
}
