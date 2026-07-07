"use client";

import { useState } from "react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Plus, Send, Download, Eye } from "lucide-react";

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

  // New invoice form state
  const [formClient, setFormClient] = useState("");
  const [formProject, setFormProject] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formError, setFormError] = useState("");

  const resetForm = () => {
    setFormClient("");
    setFormProject("");
    setFormAmount("");
    setFormDueDate("");
    setFormError("");
  };

  const handleCreateInvoice = () => {
    // Validate
    if (
      !formClient.trim() ||
      !formProject.trim() ||
      !formAmount.trim() ||
      !formDueDate.trim()
    ) {
      setFormError("All fields are required.");
      return;
    }
    setFormError("");

    const newId = `INV-2026-${String(invoices.length + 1).padStart(3, "0")}`;
    const newInvoice: Invoice = {
      id: newId,
      client: formClient.trim(),
      project: formProject.trim(),
      amount: `KES ${Number(formAmount).toLocaleString()}`,
      status: "Draft",
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
    setModalOpen(false);
    resetForm();
  };

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
    <div>
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
            <Button variant="secondary" size="sm">
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

      <div className="p-6">
        {/* Table */}
        <div className="bg-black-2 border border-[#252525] rounded-lg overflow-hidden">
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
                invoices.map((inv) => (
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
      </div>

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
            <label className="form-label">Client name</label>
            <input
              className="form-input"
              placeholder="e.g. Bidco Africa"
              value={formClient}
              onChange={(e) => setFormClient(e.target.value)}
            />
          </div>

          {/* Project */}
          <div>
            <label className="form-label">Project / description</label>
            <input
              className="form-input"
              placeholder="e.g. Brand Strategy Phase 2"
              value={formProject}
              onChange={(e) => setFormProject(e.target.value)}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="form-label">Amount (KES)</label>
            <input
              className="form-input"
              type="number"
              min={0}
              step={1000}
              placeholder="e.g. 250000"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
            />
          </div>

          {/* Due date */}
          <div>
            <label className="form-label">Due date</label>
            <input
              className="form-input"
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
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
              variant="primary"
              size="sm"
              className="flex-1 justify-center"
              onClick={handleCreateInvoice}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Create Invoice
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
