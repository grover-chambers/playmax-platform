"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Eye, RotateCcw, Link } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import ConfirmActionModal from "@/components/modals/confirm-action-modal";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/ui/status-badge";

/* ── Types ─────────────────────────────────────────── */

type TemplateCategory = "Marketing" | "Utility" | "Authentication";

type TemplateStatus = "Approved" | "Pending" | "Rejected";

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  status: TemplateStatus;
  lastSubmitted: string;
}

/* ── Sample Data ───────────────────────────────────── */

const sampleTemplates: WhatsAppTemplate[] = [
  {
    id: "1",
    name: "welcome_greeting",
    category: "Marketing",
    status: "Approved",
    lastSubmitted: "2026-06-28",
  },
  {
    id: "2",
    name: "lead_acknowledgement",
    category: "Utility",
    status: "Approved",
    lastSubmitted: "2026-06-25",
  },
  {
    id: "3",
    name: "invoice_reminder",
    category: "Utility",
    status: "Approved",
    lastSubmitted: "2026-06-20",
  },
  {
    id: "4",
    name: "booking_confirmation",
    category: "Marketing",
    status: "Pending",
    lastSubmitted: "2026-07-01",
  },
  {
    id: "5",
    name: "report_ready_notification",
    category: "Marketing",
    status: "Rejected",
    lastSubmitted: "2026-06-15",
  },
];

const STATUS_BADGE_MAP: Record<TemplateStatus, "active" | "review" | "draft"> =
  {
    Approved: "active",
    Pending: "review",
    Rejected: "draft",
  };

/* ── Page ──────────────────────────────────────────── */

export default function WhatsAppTemplatesPage() {
  const router = useRouter();
  const [templates] = useState<WhatsAppTemplate[]>(sampleTemplates);
  const [wabaIdHidden, setWabaIdHidden] = useState(true);
  const [confirmAction, setConfirmAction] = useState<"rotate" | "reconnect" | null>(null);

  const approvedCount = templates.filter((t) => t.status === "Approved").length;
  const pendingCount = templates.filter((t) => t.status === "Pending").length;
  const rejectedCount = templates.filter((t) => t.status === "Rejected").length;
  const totalSentThisMonth = 1248; // simulated

  return (
    <div>
      {/* ── Header ──────────────────────────────────── */}
      <PageHeader
        title="WhatsApp Templates"
        subtitle={`${templates.length} template${templates.length !== 1 ? "s" : ""}`}
        actions={
          <Button variant="primary" size="sm" onClick={() => router.push("/app/admin/whatsapp/submit")}>
            <Plus size={12} className="mr-1" /> Submit New Template
          </Button>
        }
      />

      {/* ── KPI Strip ───────────────────────────────── */}
      <div className="px-7 py-4 grid grid-cols-4 gap-4">
        <div className="bg-black-2 border border-[#1e1e1e] rounded-lg px-5 py-4">
          <div className="text-green text-[22px] font-display font-bold">
            {approvedCount}
          </div>
          <div className="text-[11px] text-gray-5 font-mono mt-0.5">
            Approved Templates
          </div>
        </div>

        <div className="bg-black-2 border border-[#1e1e1e] rounded-lg px-5 py-4">
          <div className="text-yellow text-[22px] font-display font-bold">
            {pendingCount}
          </div>
          <div className="text-[11px] text-gray-5 font-mono mt-0.5">
            Pending Review
          </div>
        </div>

        <div className="bg-black-2 border border-[#1e1e1e] rounded-lg px-5 py-4">
          <div className="text-red text-[22px] font-display font-bold">
            {rejectedCount}
          </div>
          <div className="text-[11px] text-gray-5 font-mono mt-0.5">
            Rejected
          </div>
        </div>

        <div className="bg-black-2 border border-[#1e1e1e] rounded-lg px-5 py-4">
          <div className="text-white text-[22px] font-display font-bold">
            {totalSentThisMonth.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-5 font-mono mt-0.5">
            Total Sent This Month
          </div>
        </div>
      </div>

      {/* ── Templates Table ─────────────────────────── */}
      <div className="px-7 py-2">
        <div className="bg-black-2 border border-[#252525] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1A1A1A]">
                {[
                  "Template Name",
                  "Category",
                  "Status",
                  "Last Submitted",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="font-mono text-[9px] text-gray-5 tracking-widest uppercase text-left px-4 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {templates.map((tmpl) => (
                <tr
                  key={tmpl.id}
                  className="border-b border-[#1A1A1A] hover:bg-white/2 transition-colors"
                >
                  {/* Name */}
                  <td className="px-4 py-3">
                    <span className="font-display text-[13px] font-semibold text-white">
                      {tmpl.name}
                    </span>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    <span className="intent-tag text-[9px]">
                      {tmpl.category}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge
                      variant={STATUS_BADGE_MAP[tmpl.status]}
                      className={
                        tmpl.status === "Rejected"
                          ? "text-red! border-red/20! bg-red/10!"
                          : ""
                      }
                    >
                      {tmpl.status}
                    </StatusBadge>
                  </td>

                  {/* Last submitted */}
                  <td className="px-4 py-3 text-[11px] text-gray-5 font-mono">
                    {tmpl.lastSubmitted}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="btn-sm py-1! px-2.5! text-[10px] hover:bg-yellow/10! hover:text-yellow!"
                        title="Sync status with WhatsApp"
                        onClick={() => router.push("/app/admin/whatsapp")}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                      <button
                        className="btn-sm py-1! px-2.5! text-[10px] hover:bg-white/10!"
                        title="View template details"
                        onClick={() => router.push("/app/admin/whatsapp")}
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {templates.length === 0 && (
            <div className="py-12 text-center text-[13px] text-gray-5">
              No templates found.
            </div>
          )}
        </div>
      </div>

      {/* ── API Connection Status ───────────────────── */}
      <div className="px-7 py-4 pb-10">
        <div className="bg-black-2 border border-[#1e1e1e] rounded-lg px-6 py-5">
          <h3 className="font-display text-[15px] font-bold mb-4">
            API Connection Status
          </h3>

          <div className="space-y-3">
            {/* WABA ID (masked) */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-5 font-mono">WABA ID</span>
              <span className="text-[12px] text-gray-4 font-mono">
                {wabaIdHidden ? "••••••••••" : "1234567890"}
                <button
                  onClick={() => setWabaIdHidden((prev) => !prev)}
                  className="ml-2 text-[10px] text-yellow hover:underline"
                >
                  {wabaIdHidden ? "Show" : "Hide"}
                </button>
              </span>
            </div>

            {/* Phone Number ID */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-5 font-mono">
                Phone Number ID
              </span>
              <span className="text-[12px] text-gray-4 font-mono">
                +254712345678
              </span>
            </div>

            {/* Business Account Status */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-5 font-mono">
                Business Account Status
              </span>
              <span className="badge badge-active">Connected</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-5 pt-4 border-t border-[#1e1e1e]">
            <Button variant="secondary" size="sm" onClick={() => setConfirmAction("rotate")}>
              <RotateCcw className="w-3 h-3 mr-1" /> Rotate API Key
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setConfirmAction("reconnect")}>
              <Link className="w-3 h-3 mr-1" /> Reconnect
            </Button>
          </div>
        </div>
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
