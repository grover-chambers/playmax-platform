"use client";

import React from "react";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/ui/status-badge";

interface Invoice {
  id: string;
  project: string;
  amount: string;
  status: string;
  statusVariant: "active" | "review" | "draft";
  issued: string;
  due: string;
  action: "pay" | "receipt" | "disabled";
}

const invoices: Invoice[] = [
  { id: "INV-2026-002", project: "Westlands Screen Package", amount: "KES 255,000", status: "Sent", statusVariant: "review", issued: "15 Jun 2026", due: "15 Jul 2026", action: "pay" },
  { id: "INV-2026-007", project: "Campaign Expansion (Deposit)", amount: "KES 445,000", status: "Draft", statusVariant: "draft", issued: "—", due: "—", action: "disabled" },
  { id: "INV-2025-012", project: "Market Research — Q1", amount: "KES 340,000", status: "Paid", statusVariant: "active", issued: "01 Jan 2026", due: "01 Feb 2026", action: "receipt" },
];

export default function PortalInvoicesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold">Invoices</h1>
        <p className="text-xs text-gray-4 mt-0.5">
          {invoices.length} invoices for P&G East Africa
        </p>
      </div>

      <div className="bg-black-2 border border-[#252525] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1A1A1A]">
              {["Invoice #", "Project", "Amount", "Status", "Issued", "Due", "Action"].map(
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
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                className="border-b border-[#1A1A1A] hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-3.5 text-[13px] font-semibold font-mono">
                  {inv.id}
                </td>
                <td className="px-4 py-3.5 text-[13px] text-gray-3">
                  {inv.project}
                </td>
                <td className="px-4 py-3.5 text-[13px] font-display font-bold text-yellow">
                  {inv.amount}
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge variant={inv.statusVariant}>
                    {inv.status}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3.5 text-[12px] text-gray-4 font-mono">
                  {inv.issued}
                </td>
                <td className="px-4 py-3.5 text-[12px] text-gray-4 font-mono">
                  {inv.due}
                </td>
                <td className="px-4 py-3.5">
                  {inv.action === "pay" && (
                    <Button variant="primary" size="sm">
                      Pay Now
                    </Button>
                  )}
                  {inv.action === "receipt" && (
                    <button className="text-[11px] text-yellow font-semibold hover:underline">
                      Receipt
                    </button>
                  )}
                  {inv.action === "disabled" && (
                    <Button variant="secondary" size="sm" disabled>
                      Pay Now
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
