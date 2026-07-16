"use client";

import { useState } from "react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import InvoiceDetailModal from "@/components/modals/invoice-detail-modal";
import {
  Plus,
  Send,
  Download,
  Eye,
  PlusCircle,
  Trash2,
  Save,
} from "lucide-react";
import { downloadCSV } from "@/lib/export-utils";
import Pagination, { usePagination } from "@/components/ui/pagination";

interface Invoice {
  id: string;
  client: string;
  project: string;
  amount: string;
  status: string;
  issued: string;
  due: string;
}

const initialInvoices: Invoice[] = [
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
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [page, setPage] = useState(1);

  // New invoice form state
  const [formClient, setFormClient] = useState("");
  const [formProject, setFormProject] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formTerms, setFormTerms] = useState("Net 30");
  const [formTaxRate, setFormTaxRate] = useState(16);
  const [formApplyTax, setFormApplyTax] = useState(true);
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [lineItems, setLineItems] = useState([
    { description: "", qty: 1, unitPrice: 0 },
  ]);

  const updateLineItem = (
    index: number,
    field: "description" | "qty" | "unitPrice",
    value: string | number,
  ) => {
    setLineItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value as never };
      return copy;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { description: "", qty: 1, unitPrice: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calcSubtotal = () =>
    lineItems.reduce((acc, item) => acc + item.qty * item.unitPrice, 0);

  const calcTax = () =>
    formApplyTax ? calcSubtotal() * (formTaxRate / 100) : 0;

  const calcTotal = () => calcSubtotal() + calcTax();

  const clientOptions = [
    "Safaricom",
    "P&G East Africa",
    "Bidco Africa",
    "Java House",
    "Naivas",
    "Unga Group",
    "Twiga Foods",
    "Kenchic",
    "Haco Industries",
    "Kevian Kenya",
  ];

  const resetForm = () => {
    setFormClient("");
    setFormProject("");
    setFormDueDate("");
    setFormTerms("Net 30");
    setFormTaxRate(16);
    setFormApplyTax(true);
    setFormNotes("");
    setFormError("");
    setLineItems([{ description: "", qty: 1, unitPrice: 0 }]);
  };

  const handleCreateInvoice = (sendImmediately = false) => {
    // Validate
    if (!formClient.trim() || !formDueDate.trim()) {
      setFormError("Client name and due date are required.");
      return;
    }
    if (lineItems.length === 0 || !lineItems[0].description.trim()) {
      setFormError("At least one line item is required.");
      return;
    }
    setFormError("");

    const total = calcTotal();

    const newId = `INV-2026-${String(invoices.length + 1).padStart(3, "0")}`;
    const newInvoice: Invoice = {
      id: newId,
      client: formClient.trim(),
      project: formProject.trim() || "—",
      amount: `KES ${total.toLocaleString()}`,
      status: sendImmediately ? "Sent" : "Draft",
      issued: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      due: new Date(formDueDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    setPage(1);
    setModalOpen(false);
    resetForm();
  };

  const { paginated, total } = usePagination(invoices, page, 20);

  const statusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "var(--pm-green)";
      case "Sent":
        return "var(--pm-yellow)";
      case "Overdue":
        return "var(--pm-red)";
      default:
        return "var(--pm-gray-4)";
    }
  };

  return (
    <div className="page-content">
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} invoices · KES ${invoices
          .reduce((acc, inv) => {
            const num = parseInt(inv.amount.replace(/[^0-9]/g, ""));
            return acc + (isNaN(num) ? 0 : num);
          }, 0)
          .toLocaleString()} total`}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const rows = invoices.map((inv) => [
                  inv.id, inv.client, inv.project, inv.amount, inv.status, inv.issued, inv.due,
                ]);
                downloadCSV(
                  ["Invoice", "Client", "Project", "Amount", "Status", "Issued", "Due"],
                  rows,
                  "invoices",
                );
              }}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Invoice
            </Button>
          </>
        }
      />

        {/* Table */}
        <div className="pm-dash-card pm-dash-card-b-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1A1A1A]">
                {[
                  "Invoice",
                  "Client",
                  "Project",
                  "Amount",
                  "Status",
                  "Issued",
                  "Due",
                  "",
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
              {invoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-gray-5 text-[13px]"
                  >
                    No invoices yet. Create your first one.
                  </td>
                </tr>
              ) : (
                paginated.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-[#1A1A1A] hover:bg-white/2 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-[13px] font-semibold font-mono">
                      {inv.id}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-white font-medium">
                      {inv.client}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-gray-3">
                      {inv.project}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] font-display font-bold text-yellow">
                      {inv.amount}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded-full border"
                        style={{
                          color: statusColor(inv.status),
                          borderColor: `${statusColor(inv.status)}30`,
                          background: `${statusColor(inv.status)}10`,
                        }}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-gray-4 font-mono">
                      {inv.issued}
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-gray-4 font-mono">
                      {inv.due}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        className="text-[11px] text-gray-5 hover:text-yellow transition-colors font-medium flex items-center gap-1"
                        title="View details"
                        onClick={() => setDetailInvoice(inv)}
                      >
                        <Eye size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />

      {/* ── New Invoice Modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title="New Invoice"
      >
        <div className="space-y-4">
          {/* Client */}
          <div>
            <label className="form-label">
              Client <span className="text-yellow">*</span>
            </label>
            <select
              className="form-select"
              value={formClient}
              onChange={(e) => setFormClient(e.target.value)}
            >
              <option value="">Select client…</option>
              {clientOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="form-label">Project (optional)</label>
            <input
              className="form-input"
              placeholder="e.g. Brand Strategy Phase 2"
              value={formProject}
              onChange={(e) => setFormProject(e.target.value)}
            />
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="form-label !mb-0">
                Line items <span className="text-yellow">*</span>
              </label>
              <button
                type="button"
                onClick={addLineItem}
                className="text-[10px] text-yellow hover:text-yellow/80 transition-colors flex items-center gap-1"
              >
                <PlusCircle className="w-3 h-3" /> Add item
              </button>
            </div>
            <div className="space-y-2">
              {lineItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className="form-input flex-1 text-[12px]"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) =>
                      updateLineItem(i, "description", e.target.value)
                    }
                  />
                  <input
                    className="form-input w-16 text-[12px] text-center"
                    type="number"
                    min={1}
                    value={item.qty}
                    onChange={(e) =>
                      updateLineItem(i, "qty", parseInt(e.target.value) || 1)
                    }
                  />
                  <input
                    className="form-input w-24 text-[12px]"
                    type="number"
                    min={0}
                    placeholder="Price"
                    value={item.unitPrice || ""}
                    onChange={(e) =>
                      updateLineItem(
                        i,
                        "unitPrice",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                  />
                  <span className="text-[11px] text-gray-4 w-16 text-right font-mono">
                    KES {(item.qty * item.unitPrice).toLocaleString()}
                  </span>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(i)}
                      className="text-gray-5 hover:text-red transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Running total */}
          <div className="pm-dash-card px-3 py-2.5 space-y-1">
            <div className="flex justify-between text-[11px] text-gray-4">
              <span>Subtotal</span>
              <span className="font-mono">
                KES {calcSubtotal().toLocaleString()}
              </span>
            </div>
            {formApplyTax && (
              <div className="flex justify-between text-[11px] text-gray-4">
                <span>VAT ({formTaxRate}%)</span>
                <span className="font-mono">
                  KES {calcTax().toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between text-[13px] font-display font-bold text-yellow border-t border-[#2a2a2a] pt-1.5 mt-1">
              <span>Total</span>
              <span className="font-mono">
                KES {calcTotal().toLocaleString()}
              </span>
            </div>
          </div>

          {/* Due date + Payment terms */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">
                Due date <span className="text-yellow">*</span>
              </label>
              <input
                className="form-input"
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Payment terms</label>
              <select
                className="form-select"
                value={formTerms}
                onChange={(e) => setFormTerms(e.target.value)}
              >
                <option value="On receipt">On receipt</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Milestone-based">Milestone-based</option>
              </select>
            </div>
          </div>

          {/* VAT toggle */}
          <div className="flex items-center gap-3">
            <label className="form-label !mb-0">Apply VAT</label>
            <button
              type="button"
              onClick={() => setFormApplyTax(!formApplyTax)}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                formApplyTax ? "bg-yellow" : "bg-[#333]"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-all ${
                  formApplyTax ? "left-[22px]" : "left-[2px]"
                }`}
              />
            </button>
            {formApplyTax && (
              <input
                className="form-input w-20 text-[12px]"
                type="number"
                min={0}
                max={100}
                value={formTaxRate}
                onChange={(e) =>
                  setFormTaxRate(parseFloat(e.target.value) || 0)
                }
              />
            )}
            {formApplyTax && <span className="text-[10px] text-gray-5">%</span>}
          </div>

          {/* Notes */}
          <div>
            <label className="form-label">Notes / Terms</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Payment instructions, terms, etc."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />
          </div>

          {/* Error */}
          {formError && (
            <div className="text-red text-[12px] font-medium">{formError}</div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 justify-center"
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 justify-center"
              onClick={() => handleCreateInvoice(false)}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save as Draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1 justify-center"
              onClick={() => handleCreateInvoice(true)}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Save &amp; Send
            </Button>
          </div>
        </div>
      </Modal>

      <InvoiceDetailModal
        open={detailInvoice !== null}
        onClose={() => setDetailInvoice(null)}
        invoice={detailInvoice}
      />
    </div>
  );
}
