"use client";

import { useState } from "react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import FilterPill from "@/components/ui/filter-pill";
import StatCard from "@/components/ui/stat-card";
import StatusBadge from "@/components/ui/status-badge";

const statusFilters = ["All", "Draft", "Sent", "Paid", "Overdue"] as const;

const statusVariantMap: Record<string, "active" | "review" | "draft"> = {
  Paid: "active",
  Sent: "review",
  Draft: "draft",
};

interface Invoice {
  id: string;
  client: string;
  project: string;
  amount: string;
  status: string;
  issued: string;
  due: string;
}

const invoices: Invoice[] = [
  {
    id: "INV-2026-001",
    client: "Safaricom",
    project: "CBD Billboard Campaign",
    amount: "KES 190,000",
    status: "Paid",
    issued: "01 Jun 2026",
    due: "01 Jul 2026",
  },
  {
    id: "INV-2026-002",
    client: "P&G East Africa",
    project: "Westlands Screen Package",
    amount: "KES 255,000",
    status: "Sent",
    issued: "15 Jun 2026",
    due: "15 Jul 2026",
  },
  {
    id: "INV-2026-003",
    client: "Bidco Africa",
    project: "Mombasa Rd Billboard",
    amount: "KES 360,000",
    status: "Overdue",
    issued: "01 Jun 2026",
    due: "01 Jul 2026",
  },
  {
    id: "INV-2026-004",
    client: "Java House",
    project: "Brand Perception Study",
    amount: "KES 580,000",
    status: "Sent",
    issued: "20 Jun 2026",
    due: "20 Jul 2026",
  },
  {
    id: "INV-2026-005",
    client: "Naivas",
    project: "Consumer Survey Report",
    amount: "KES 450,000",
    status: "Paid",
    issued: "01 May 2026",
    due: "01 Jun 2026",
  },
  {
    id: "INV-2026-006",
    client: "Unga Group",
    project: "Competitor Analysis",
    amount: "KES 220,000",
    status: "Draft",
    issued: "—",
    due: "—",
  },
];

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== "All" && inv.status !== statusFilter) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="12 invoices · KES 3.8M outstanding"
        actions={
          <>
            <Button variant="secondary" size="sm">
              Filter
            </Button>
            <Button variant="primary" size="sm">
              + New Invoice
            </Button>
          </>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-5">
          <StatCard value="KES 6.2M" label="Total Invoiced YTD" />
          <StatCard value="KES 3.8M" label="Outstanding" />
          <StatCard value="KES 2.4M" label="Collected" />
          <StatCard value="61%" label="Collection Rate" />
        </div>

        <div className="flex gap-1.5 mb-5">
          {statusFilters.map((f) => (
            <FilterPill
              key={f}
              active={statusFilter === f}
              onClick={() => setStatusFilter(f)}
            >
              {f}
            </FilterPill>
          ))}
        </div>

        <div className="bg-black-2 border border-[#252525] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1A1A1A]">
                {["Invoice #", "Client", "Project", "Amount", "Status", "Issued", "Due"].map(
                  (h) => (
                    <th
                      key={h}
                      className="font-mono text-[9px] text-gray-5 tracking-widest uppercase text-left px-4 py-3"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-[#1A1A1A] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 text-[13px] font-semibold font-mono">
                    {inv.id}
                  </td>
                  <td className="px-4 py-3 text-[13px] font-semibold">
                    {inv.client}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-gray-3">
                    {inv.project}
                  </td>
                  <td className="px-4 py-3 text-[13px] font-display font-bold text-yellow">
                    {inv.amount}
                  </td>
                  <td className="px-4 py-3">
                    {inv.status === "Overdue" ? (
                      <span className="font-mono text-[9px] px-2 py-0.5 bg-red/10 text-red rounded-full font-bold">
                        OVERDUE
                      </span>
                    ) : (
                      <StatusBadge variant={statusVariantMap[inv.status] || "draft"}>
                        {inv.status.toUpperCase()}
                      </StatusBadge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-gray-4 font-mono">
                    {inv.issued}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-gray-4 font-mono">
                    {inv.due}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-[13px] text-gray-5">
              No invoices match the selected filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
