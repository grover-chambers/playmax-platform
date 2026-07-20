"use client";

import React, { useRef } from "react";
import InvoicePDFDownload from "@/components/pdf/InvoicePDFDownload";

interface InvoiceData {
  invoice_number: string;
  amount: number;
  status: string;
  issued_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  line_items?: Record<string, unknown>[] | null;
  projects?: { name: string }[] | null;
  client_name?: string;
  client_company?: string;
  client_email?: string;
}

interface InvoicePDFProps {
  invoice: InvoiceData;
  onClose?: () => void;
}

function formatCurrency(amount: number): string {
  return `KES ${amount.toLocaleString()}`;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parseLineItems(items: unknown): Array<{ description: string; quantity: number; rate: number; amount: number }> {
  try {
    if (Array.isArray(items)) return items as Array<{ description: string; quantity: number; rate: number; amount: number }>;
    if (typeof items === "string") return JSON.parse(items);
  } catch {}
  return [];
}

export default function InvoicePDF({ invoice, onClose }: InvoicePDFProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const lineItems = parseLineItems(invoice.line_items);
  const subtotal = invoice.amount;
  const tax = 0;
  const total = subtotal + tax;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const content = printRef.current?.innerHTML || "";
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            @page { margin: 20mm; }
            body { font-family: 'Courier New', monospace; color: #111; margin: 0; padding: 20px; }
            .invoice { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .header-left h1 { font-size: 24px; margin: 0; text-transform: uppercase; letter-spacing: 2px; }
            .header-left p { color: #666; font-size: 12px; margin: 4px 0; }
            .header-right { text-align: right; }
            .header-right h2 { font-size: 18px; color: #111; margin: 0; }
            .header-right .status { font-size: 11px; text-transform: uppercase; }
            .section { margin-bottom: 20px; }
            .section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; font-size: 12px; }
            th { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
            .total-row td { font-weight: bold; border-top: 2px solid #111; }
            .total-amount { font-size: 16px; }
            .notes { background: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 11px; }
            .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="invoice">${content}</div>
          <script>window.print(); window.onafterprint = () => window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-gray-900">Invoice Preview</h2>
            <div className="flex items-center gap-2">
              <InvoicePDFDownload invoice={invoice} />
              <button
                onClick={handlePrint}
                className="px-4 py-2 text-[12px] font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Print / PDF
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-[12px] font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>

          <div ref={printRef} className="p-6">
            <div className="header flex justify-between mb-6">
              <div className="header-left">
                <h1 className="text-[22px] font-bold uppercase tracking-wider text-gray-900">PlayMax</h1>
                <p className="text-[11px] text-gray-500">Oxygen Media House · Nairobi, Kenya</p>
                <p className="text-[11px] text-gray-500">info@playmax.africa</p>
              </div>
              <div className="header-right text-right">
                <h2 className="text-[16px] font-bold text-gray-900 font-mono">{invoice.invoice_number}</h2>
                <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: invoice.status === "paid" ? "#059669" : invoice.status === "overdue" ? "#dc2626" : "#d97706" }}>
                  {invoice.status}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Bill To</div>
                <div className="text-[13px] text-gray-800 font-medium">{invoice.client_name || "Client"}</div>
                {invoice.client_company && <div className="text-[12px] text-gray-600">{invoice.client_company}</div>}
                {invoice.client_email && <div className="text-[12px] text-gray-600">{invoice.client_email}</div>}
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Invoice Details</div>
                <div className="text-[12px] text-gray-600">Issued: {formatDate(invoice.issued_date)}</div>
                <div className="text-[12px] text-gray-600">Due: {formatDate(invoice.due_date)}</div>
                {invoice.paid_date && <div className="text-[12px] text-teal">Paid: {formatDate(invoice.paid_date)}</div>}
              </div>
            </div>

            {invoice.projects?.[0]?.name && (
              <div className="mb-4 text-[12px] text-gray-600">
                <span className="font-medium">Project:</span> {invoice.projects[0].name}
              </div>
            )}

            <table className="w-full mb-6">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-[9px] uppercase tracking-wider text-gray-400 text-left py-2">Description</th>
                  <th className="text-[9px] uppercase tracking-wider text-gray-400 text-right py-2">Qty</th>
                  <th className="text-[9px] uppercase tracking-wider text-gray-400 text-right py-2">Rate</th>
                  <th className="text-[9px] uppercase tracking-wider text-gray-400 text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length > 0 ? lineItems.map((item, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="text-[12px] text-gray-800 py-3">{item.description || "Service"}</td>
                    <td className="text-[12px] text-gray-800 text-right py-3">{item.quantity || 1}</td>
                    <td className="text-[12px] text-gray-800 text-right py-3">{formatCurrency(item.rate || 0)}</td>
                    <td className="text-[12px] text-gray-800 text-right py-3">{formatCurrency(item.amount || 0)}</td>
                  </tr>
                )) : (
                  <tr className="border-b border-gray-200">
                    <td className="text-[12px] text-gray-800 py-3" colSpan={3}>Services rendered</td>
                    <td className="text-[12px] text-gray-800 text-right py-3">{formatCurrency(subtotal)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-[12px] text-gray-600 text-right py-2">Subtotal</td>
                  <td className="text-[12px] text-gray-800 text-right py-2">{formatCurrency(subtotal)}</td>
                </tr>
                {tax > 0 && (
                  <tr>
                    <td colSpan={3} className="text-[12px] text-gray-600 text-right py-2">Tax</td>
                    <td className="text-[12px] text-gray-800 text-right py-2">{formatCurrency(tax)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={3} className="text-[12px] font-bold text-right py-2 border-t-2 border-gray-800">Total</td>
                  <td className="text-[16px] font-bold text-right py-2 border-t-2 border-gray-800">{formatCurrency(total)}</td>
                </tr>
              </tfoot>
            </table>

            {invoice.notes && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Notes</div>
                <div className="text-[12px] text-gray-700 whitespace-pre-wrap">{invoice.notes}</div>
              </div>
            )}

            <div className="text-center text-[10px] text-gray-400 border-t border-gray-200 pt-4 mt-4">
              Thank you for your business · Payment due within 30 days
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
