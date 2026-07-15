"use client";

import { useState } from "react";
import Pagination, { usePagination } from "@/components/ui/pagination";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Download } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/ui/status-badge";
import { downloadCSV } from "@/lib/export-utils";

const fullHistory = [
  { id: "INV-2026-007", date: "01 Jul 2026", amount: "KES 45,000", status: "paid" as const },
  { id: "INV-2026-006", date: "01 Jun 2026", amount: "KES 45,000", status: "paid" as const },
  { id: "INV-2026-005", date: "01 May 2026", amount: "KES 45,000", status: "paid" as const },
  { id: "INV-2026-004", date: "01 Apr 2026", amount: "KES 45,000", status: "paid" as const },
  { id: "INV-2026-003", date: "01 Mar 2026", amount: "KES 45,000", status: "paid" as const },
  { id: "INV-2026-002", date: "01 Feb 2026", amount: "KES 45,000", status: "paid" as const },
  { id: "INV-2026-001", date: "01 Jan 2026", amount: "KES 45,000", status: "paid" as const },
  { id: "INV-2025-012", date: "01 Dec 2025", amount: "KES 45,000", status: "paid" as const },
  { id: "INV-2025-011", date: "01 Nov 2025", amount: "KES 45,000", status: "paid" as const },
  { id: "INV-2025-010", date: "01 Oct 2025", amount: "KES 45,000", status: "paid" as const },
  { id: "INV-2025-009", date: "01 Sep 2025", amount: "KES 45,000", status: "paid" as const },
  { id: "INV-2025-008", date: "01 Aug 2025", amount: "KES 45,000", status: "paid" as const },
];

const statusVariant: Record<string, "active" | "review" | "draft" | "confirmed"> = {
  paid: "active",
  pending: "review",
};

export default function BillingHistoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = fullHistory.filter(
    (inv) =>
      inv.id.toLowerCase().includes(search.toLowerCase()) ||
      inv.status.toLowerCase().includes(search.toLowerCase()),
  );

  const { paginated, total } = usePagination(filtered, page, 20);

  return (
    <div>
      <PageHeader
        title="Billing History"
        subtitle="All invoices and payments"
        actions={
          <Button variant="secondary" size="sm" onClick={() => router.back()}>
            <ArrowLeft size={14} className="mr-1" /> Back
          </Button>
        }
      />

      <div className="px-7 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-5" />
            <input
              className="w-full bg-black border border-[#252525] rounded-lg pl-9 pr-3 py-2 text-[12px] text-white placeholder:text-gray-5 outline-none focus:border-yellow/40"
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const rows = filtered.map((inv) => [inv.id, inv.date, inv.amount, inv.status]);
              downloadCSV(["Invoice", "Date", "Amount", "Status"], rows, "billing-history");
            }}
          >
            <Download size={14} className="mr-1" /> Export
          </Button>
        </div>

        <div className="bg-black-2 border border-[#1e1e1e] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Invoice", "Date", "Amount", "Status"].map((h) => (
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
              {paginated.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-[#1e1e1e] hover:bg-white/2 transition-colors"
                >
                  <td className="px-4 py-3 text-[12px] font-mono font-medium text-white">
                    {inv.id}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-gray-5 font-mono">{inv.date}</td>
                  <td className="px-4 py-3 font-display text-[13px] font-semibold text-white">
                    {inv.amount}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge variant={statusVariant[inv.status]}>
                      {inv.status === "paid" ? "Paid" : "Pending"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-[13px] text-gray-5">
              No invoices match your search.
            </div>
          )}
          <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}
