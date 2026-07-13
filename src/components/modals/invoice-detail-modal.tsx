"use client";

import Modal from "@/components/ui/modal";
import { Calendar, User, FileText } from "lucide-react";

interface Invoice {
  id: string;
  client: string;
  project: string;
  amount: string;
  status: string;
  issued: string;
  due: string;
}

interface InvoiceDetailModalProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export default function InvoiceDetailModal({ open, onClose, invoice }: InvoiceDetailModalProps) {
  if (!invoice) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Invoice ${invoice.id}`} className="max-w-lg">
      <div className="space-y-5">
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${
            invoice.status === "Paid"
              ? "bg-green/10 text-green border-green/20"
              : invoice.status === "Pending"
                ? "bg-yellow/10 text-yellow border-yellow/20"
                : "bg-red/10 text-red border-red/20"
          }`}
        >
          {invoice.status}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2.5">
            <User size={14} className="text-gray-5 shrink-0" />
            <div>
              <p className="text-[9px] text-gray-5 font-mono uppercase tracking-wider">Client</p>
              <p className="text-[13px] text-white font-medium">{invoice.client}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <FileText size={14} className="text-gray-5 shrink-0" />
            <div>
              <p className="text-[9px] text-gray-5 font-mono uppercase tracking-wider">Project</p>
              <p className="text-[13px] text-white font-medium">{invoice.project}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Calendar size={14} className="text-gray-5 shrink-0" />
            <div>
              <p className="text-[9px] text-gray-5 font-mono uppercase tracking-wider">Issued</p>
              <p className="text-[13px] text-white font-medium">{invoice.issued}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Calendar size={14} className="text-gray-5 shrink-0" />
            <div>
              <p className="text-[9px] text-gray-5 font-mono uppercase tracking-wider">Due</p>
              <p className="text-[13px] text-white font-medium">{invoice.due}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#252525]">
          <span className="text-[11px] text-gray-5 font-mono uppercase tracking-wider">
            Total Amount
          </span>
          <span className="font-display text-lg font-bold text-white">{invoice.amount}</span>
        </div>
      </div>
    </Modal>
  );
}
