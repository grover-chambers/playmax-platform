"use client";

import React from "react";
import {
  CreditCard,
  Download,
  ShieldCheck,
  ArrowUpCircle,
  ChevronRight,
  Calendar,
  Building2,
} from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/ui/status-badge";

/* ── Sample billing history data ── */
const billingHistory = [
  {
    id: "INV-2026-007",
    date: "01 Jul 2026",
    amount: "KES 45,000",
    status: "paid" as const,
  },
  {
    id: "INV-2026-006",
    date: "01 Jun 2026",
    amount: "KES 45,000",
    status: "paid" as const,
  },
  {
    id: "INV-2026-005",
    date: "01 May 2026",
    amount: "KES 45,000",
    status: "paid" as const,
  },
  {
    id: "INV-2026-004",
    date: "01 Apr 2026",
    amount: "KES 45,000",
    status: "paid" as const,
  },
  {
    id: "INV-2026-003",
    date: "01 Mar 2026",
    amount: "KES 45,000",
    status: "paid" as const,
  },
  {
    id: "INV-2026-002",
    date: "01 Feb 2026",
    amount: "KES 45,000",
    status: "paid" as const,
  },
  {
    id: "INV-2026-001",
    date: "01 Jan 2026",
    amount: "KES 45,000",
    status: "paid" as const,
  },
];

/* ── Map status to StatusBadge variant ── */
const statusVariant: Record<
  string,
  "active" | "review" | "draft" | "confirmed"
> = {
  paid: "active",
  pending: "review",
};

export default function BillingPage() {
  return (
    <div>
      {/* ── Page header ── */}
      <PageHeader
        title="Billing & SaaS License"
        subtitle="PlayMax Pro · Super Admin"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm">
              <ArrowUpCircle size={14} className="mr-1" /> Upgrade Plan
            </Button>
            <Button variant="secondary" size="sm">
              <Download size={14} className="mr-1" /> Download History
            </Button>
          </div>
        }
      />

      <div className="px-7 py-5 space-y-6">
        {/* ── Current Plan Card ── */}
        <div className="bg-black-2 border border-[#1e1e1e] rounded-lg p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow/15 text-yellow flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-display text-[15px] font-bold text-white">
                  PlayMax Pro
                </h3>
                <p className="text-[11px] text-gray-5 mt-0.5">Current Plan</p>
              </div>
            </div>
            <StatusBadge variant="active">Active</StatusBadge>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-[9px] text-gray-5 font-mono tracking-widest uppercase mb-1">
                Monthly Price
              </p>
              <p className="font-display text-[18px] font-bold text-white">
                KES 45,000
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
                <span className="text-[13px] text-white font-medium">
                  Monthly
                </span>
              </div>
            </div>
            <div>
              <p className="text-[9px] text-gray-5 font-mono tracking-widest uppercase mb-1">
                Next Billing Date
              </p>
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-gray-5" />
                <span className="text-[13px] text-white font-medium">
                  01 Aug 2026
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Payment Method Card ── */}
        <div className="bg-black-2 border border-[#1e1e1e] rounded-lg p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green/15 text-green flex items-center justify-center">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="font-display text-[15px] font-bold text-white">
                  Payment Method
                </h3>
                <p className="text-[11px] text-gray-5 mt-0.5">
                  Primary payment method on file
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-bold text-gray-4 font-mono">
                VISA
              </div>
              <div>
                <p className="text-[13px] text-white font-semibold">
                  Visa ending in 4242
                </p>
                <p className="text-[11px] text-gray-5 mt-0.5">
                  Expires 12/2027
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm">
                Update
              </Button>
              <Button variant="secondary" size="sm">
                Change Payment Method
              </Button>
            </div>
          </div>
        </div>

        {/* ── Billing History Table ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-[15px] font-bold text-white">
              Billing History
            </h3>
            <button className="text-[10px] text-yellow font-mono tracking-wider uppercase hover:underline flex items-center gap-1">
              View All <ChevronRight size={12} />
            </button>
          </div>

          <div className="bg-black-2 border border-[#1e1e1e] rounded-lg overflow-hidden">
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
                {billingHistory.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-[#1e1e1e] hover:bg-white/2 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-mono font-medium text-white">
                        {invoice.id}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-5 font-mono">
                      {invoice.date}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-display text-[13px] font-semibold text-white">
                        {invoice.amount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={statusVariant[invoice.status]}>
                        {invoice.status === "paid" ? "Paid" : "Pending"}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add payment method row */}
            <div className="px-4 py-3 border-t border-[#1e1e1e]">
              <button className="flex items-center gap-2 text-[11px] text-yellow hover:underline">
                <Building2 size={13} />
                Add payment method
              </button>
            </div>
          </div>
        </div>

        {/* ── Bottom action buttons ── */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="primary">
            <ArrowUpCircle size={14} className="mr-1.5" /> Upgrade Plan
          </Button>
          <Button variant="secondary">
            <Download size={14} className="mr-1.5" /> Download Billing History
          </Button>
          <Button variant="secondary">
            <CreditCard size={14} className="mr-1.5" /> Change Payment Method
          </Button>
        </div>
      </div>
    </div>
  );
}
