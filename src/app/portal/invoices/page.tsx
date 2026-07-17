"use client";

import React, { useState, useEffect, startTransition } from "react";
import StatusBadge from "@/components/ui/status-badge";
import InvoicePDF from "@/components/pdf/InvoicePDF";
import { Loader2, Download, Smartphone } from "lucide-react";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  issued_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  line_items?: Record<string, unknown>[] | null;
  projects?: { name: string }[] | null;
}

function formatCurrency(amount: number): string {
  return `KES ${amount.toLocaleString()}`;
}

function mapStatus(status: string): "active" | "review" | "draft" {
  switch (status) {
    case "paid": return "active";
    case "sent":
    case "overdue": return "review";
    default: return "draft";
  }
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PortalInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentMsg, setPaymentMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  const canPay = (status: string) => ["draft", "sent", "overdue"].includes(status);

  const handleMpesaPayment = async (invoiceId: string) => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setPaymentMsg({ type: "error", text: "Please enter a valid M-Pesa phone number" });
      return;
    }
    setPaymentMsg(null);
    try {
      const res = await fetch(`/api/portal/invoices/${invoiceId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber }),
      });
      const data = await res.json();
      if (data.error) {
        setPaymentMsg({ type: "error", text: data.error });
      } else {
        setPaymentMsg({ type: "success", text: data.message || "M-Pesa STK Push sent!" });
        setPayingInvoice(null);
        setPhoneNumber("");
      }
    } catch {
      setPaymentMsg({ type: "error", text: "Failed to initiate payment" });
    }
  };

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

      {paymentMsg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-[12px] ${
          paymentMsg.type === "success" ? "bg-teal/10 text-teal border border-teal/20" : "bg-red/10 text-red border border-red/20"
        }`}>
          {paymentMsg.text}
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="pm-dash-card pm-dash-card-b text-center text-[13px] text-gray-4">
          No invoices yet
        </div>
      ) : (
        <div className="pm-dash-card pm-dash-card-b-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1A1A1A]">
                {["Invoice #", "Project", "Amount", "Status", "Issued", "Due", ""].map((h) => (
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
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewInvoice(inv)}
                        className="px-2 py-1 text-[10px] font-medium text-gray-4 hover:text-white border border-[#2A2A2A] rounded-lg hover:border-gray-5 transition-colors"
                        title="Preview / Download PDF"
                      >
                        <Download size={11} />
                      </button>
                      {canPay(inv.status) && (
                        <button
                          onClick={() => setPayingInvoice(payingInvoice === inv.id ? null : inv.id)}
                          className="px-2 py-1 text-[10px] font-medium text-teal hover:text-white border border-teal/30 rounded-lg hover:bg-teal/10 transition-colors"
                          title="Pay with M-Pesa"
                        >
                          <Smartphone size={11} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inline M-Pesa payment form */}
      {payingInvoice && (
        <div className="mt-4 pm-dash-card p-4">
          <div className="text-[13px] font-semibold mb-2">Pay with M-Pesa</div>
          <div className="flex items-center gap-2">
            <input
              type="tel"
              placeholder="0712 345 678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="flex-1 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-[13px] text-white placeholder-gray-5 font-mono focus:outline-none focus:border-teal/50"
            />
            <button
              onClick={() => handleMpesaPayment(payingInvoice)}
              className="px-4 py-2 text-[12px] font-medium bg-teal text-black rounded-lg hover:bg-teal/90 transition-colors"
            >
              Pay Now
            </button>
            <button
              onClick={() => { setPayingInvoice(null); setPhoneNumber(""); setPaymentMsg(null); }}
              className="px-3 py-2 text-[12px] text-gray-4 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
          <div className="text-[10px] text-gray-5 mt-2">
            You will receive an M-Pesa STK Push prompt on the number above.
          </div>
        </div>
      )}

      {/* Invoice PDF Preview Modal */}
      {previewInvoice && (
        <InvoicePDF
          invoice={{
            ...previewInvoice,
            client_name: undefined,
            client_company: undefined,
            client_email: undefined,
          }}
          onClose={() => setPreviewInvoice(null)}
        />
      )}
    </div>
  );
}
