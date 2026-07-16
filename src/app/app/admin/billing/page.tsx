"use client";

import React, { useState, useEffect } from "react";
import Pagination, { usePagination } from "@/components/ui/pagination";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Download,
  ShieldCheck,
  ArrowUpCircle,
  ChevronRight,
  Calendar,
  Building2,
  Loader2,
} from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import PaymentMethodModal from "@/components/modals/payment-method-modal";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/ui/status-badge";

/* ── Types ─────────────────────────────────────────────── */

interface BillingPlan {
  plan_name: string;
  monthly_price: string;
  billing_cycle: string;
  next_billing_date: string;
  status: string;
}

interface BillingHistoryEntry {
  id: string;
  date: string;
  amount: string;
  status: "paid" | "pending";
}

/* ── Defaults ──────────────────────────────────────────── */

const defaultPlan: BillingPlan = {
  plan_name: "PlayMax Pro",
  monthly_price: "KES 45,000",
  billing_cycle: "Monthly",
  next_billing_date: "01 Aug 2026",
  status: "active",
};

const defaultHistory: BillingHistoryEntry[] = [];

/* ── Map status to StatusBadge variant ─────────────────── */

const statusVariant: Record<string, "active" | "review" | "draft" | "confirmed"> = {
  paid: "active",
  pending: "review",
};

/* ── Page ──────────────────────────────────────────────── */

export default function BillingPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [paymentModal, setPaymentModal] = useState<"update" | "change" | "add" | null>(null);
  const [loading, setLoading] = useState(true);

  const [plan, setPlan] = useState<BillingPlan>(defaultPlan);
  const [history, setHistory] = useState<BillingHistoryEntry[]>(defaultHistory);

  /* ── Load billing settings from org_settings ─────────── */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (!cancelled) {
          if (json.settings?.billing?.plan) {
            setPlan({ ...defaultPlan, ...json.settings.billing.plan });
          }
          if (json.settings?.billing?.history) {
            setHistory(json.settings.billing.history);
          }
        }
      } catch {
        // Use defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const { paginated, total } = usePagination(history, page, 20);

  /* ── Loading state ───────────────────────────────────── */

  if (loading) {
    return (
      <div className="page-content">
        <PageHeader title="Billing & SaaS License" subtitle="Loading…" />
        <div className="flex items-center justify-center py-24 text-gray-5">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading billing info…
        </div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────── */

  return (
    <div className="page-content">
      {/* Page header */}
      <PageHeader
        title="Billing & SaaS License"
        subtitle={`${plan.plan_name} · Super Admin`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push("/app/admin/billing/upgrade")}
            >
              <ArrowUpCircle size={14} className="mr-1" /> Upgrade Plan
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Download size={14} className="mr-1" /> Download History
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Current Plan Card */}
        <div className="pm-dash-card p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow/15 text-yellow flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-display text-[15px] font-bold">
                  {plan.plan_name}
                </h3>
                <p className="text-[11px] text-gray-5 mt-0.5">Current Plan</p>
              </div>
            </div>
            <StatusBadge variant={plan.status === "active" ? "active" : "draft"}>
              {plan.status === "active" ? "Active" : "Inactive"}
            </StatusBadge>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-[9px] text-gray-5 font-mono tracking-widest uppercase mb-1">
                Monthly Price
              </p>
              <p className="font-display text-[18px] font-bold">
                {plan.monthly_price}
                <span className="text-[11px] text-gray-5 font-mono font-normal ml-1">
                  /mo
                </span>
              </p>
            </div>
            <div>
              <p className="text-[9px] text-gray-5 font-mono tracking-widest uppercase mb-1">
                Billing Cycle
              </p>
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-gray-5" />
                <span className="text-[13px] font-medium">{plan.billing_cycle}</span>
              </div>
            </div>
            <div>
              <p className="text-[9px] text-gray-5 font-mono tracking-widest uppercase mb-1">
                Next Billing Date
              </p>
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-gray-5" />
                <span className="text-[13px] font-medium">{plan.next_billing_date}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method Card */}
        <div className="pm-dash-card p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green/15 text-green flex items-center justify-center">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="font-display text-[15px] font-bold">Payment Method</h3>
                <p className="text-[11px] text-gray-5 mt-0.5">
                  Primary payment method on file
                </p>
              </div>
            </div>
          </div>

          <div className="pm-dash-card bg-[#111] p-4 rounded-lg border border-[#1e1e1e]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-bold text-gray-4 font-mono">
                VISA
              </div>
              <div>
                <p className="text-[13px] font-semibold">
                  Visa ending in 4242
                </p>
                <p className="text-[11px] text-gray-5 mt-0.5">Expires 12/2027</p>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-gray-5 mt-4 leading-relaxed">
            Payment integration coming soon. Currently billing is managed manually.
          </p>

          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#1e1e1e]">
            <Button variant="secondary" size="sm" onClick={() => setPaymentModal("update")}>
              Update
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPaymentModal("change")}>
              Change Payment Method
            </Button>
          </div>
        </div>

        {/* Billing History Table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-[15px] font-bold">Billing History</h3>
            <button
              className="text-[10px] text-yellow font-mono tracking-wider uppercase hover:underline flex items-center gap-1"
              onClick={() => router.push("/app/admin/billing/history")}
            >
              View All <ChevronRight size={12} />
            </button>
          </div>

          <div className="pm-dash-card pm-dash-card-b-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  {["Invoice #", "Date", "Amount", "Status"].map((h) => (
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
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-[13px] text-gray-5">
                      No billing history yet. Invoices will appear here once generated.
                    </td>
                  </tr>
                ) : (
                  paginated.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-[#1e1e1e] hover:bg-white/2 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-[12px] font-mono font-medium">
                          {invoice.id}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-gray-5 font-mono">
                        {invoice.date}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-display text-[13px] font-semibold">
                          {invoice.amount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge variant={statusVariant[invoice.status]}>
                          {invoice.status === "paid" ? "Paid" : "Pending"}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />

            {/* Add payment method row */}
            <div className="px-4 py-3 border-t border-[#1e1e1e]">
              <button
                className="flex items-center gap-2 text-[11px] text-yellow hover:underline"
                onClick={() => setPaymentModal("add")}
              >
                <Building2 size={13} />
                Add payment method
              </button>
            </div>
          </div>
        </div>

        {/* Bottom action buttons */}
        <div className="flex items-center gap-3 pt-2 pb-8">
          <Button variant="primary" onClick={() => router.push("/app/admin/billing/upgrade")}>
            <ArrowUpCircle size={14} className="mr-1.5" /> Upgrade Plan
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Download size={14} className="mr-1.5" /> Download Billing History
          </Button>
          <Button variant="secondary" onClick={() => setPaymentModal("change")}>
            <CreditCard size={14} className="mr-1.5" /> Change Payment Method
          </Button>
        </div>
      </div>

      <PaymentMethodModal
        open={paymentModal !== null}
        onClose={() => setPaymentModal(null)}
        mode={paymentModal ?? "add"}
      />
    </div>
  );
}
