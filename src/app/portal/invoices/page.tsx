"use client";

import React, { useState, useEffect, startTransition } from "react";
import StatusBadge from "@/components/ui/status-badge";
import { Loader2 } from "lucide-react";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  issued_date: string | null;
  due_date: string | null;
  projects?: { name: string }[] | null;
}

function formatCurrency(amount: number): string {
  return `KES ${amount.toLocaleString()}`;
}

function mapStatus(status: string): "active" | "review" | "draft" {
  switch (status) {
    case "paid":
      return "active";
    case "sent":
    case "overdue":
      return "review";
    default:
      return "draft";
  }
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PortalInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/invoices")
      .then((r) => r.json())
      .then(({ invoices: data }) => {
        startTransition(() => {
          setInvoices(data || []);
          setLoading(false);
        });
      })
      .catch(() => startTransition(() => setLoading(false)));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-teal" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold">Invoices</h1>
        <p className="text-xs text-gray-4 mt-0.5">
          {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
        </p>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-black-2 border border-[#252525] rounded-lg p-8 text-center text-[13px] text-gray-4">
          No invoices yet
        </div>
      ) : (
        <div className="bg-black-2 border border-[#252525] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1A1A1A]">
                {["Invoice #", "Project", "Amount", "Status", "Issued", "Due"].map((h) => (
                  <th key={h} className="font-mono text-[9px] text-gray-5 tracking-widest uppercase text-left px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-[#1A1A1A] transition-colors">
                  <td className="px-4 py-3.5 text-[13px] font-semibold font-mono">{inv.invoice_number}</td>
                  <td className="px-4 py-3.5 text-[13px] text-gray-3">{inv.projects?.[0]?.name || "—"}</td>
                  <td className="px-4 py-3.5 text-[13px] font-display font-bold text-yellow">
                    {formatCurrency(inv.amount)}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge variant={mapStatus(inv.status)}>{inv.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-gray-4 font-mono">{formatDate(inv.issued_date)}</td>
                  <td className="px-4 py-3.5 text-[12px] text-gray-4 font-mono">{formatDate(inv.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
