"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";

interface NewReportModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export default function NewReportModal({ open, onClose, onCreated }: NewReportModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("market_research");
  const [visibleToClient, setVisibleToClient] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), type, visible_to_client: visibleToClient }),
      });
      if (res.ok) {
        onCreated?.();
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Report">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
            Title
          </label>
          <input
            className="w-full bg-black border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-gray-5 outline-none focus:border-yellow/40 transition-colors"
            placeholder="e.g. Q3 Billboard ROI Analysis"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
            Type
          </label>
          <select
            className="w-full bg-black border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-yellow/40 transition-colors"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="market_research">Market Research</option>
            <option value="performance">Performance</option>
            <option value="financial">Financial</option>
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={visibleToClient}
            onChange={(e) => setVisibleToClient(e.target.checked)}
            className="w-3.5 h-3.5 accent-yellow"
          />
          <span className="text-[12px] text-gray-4">Visible to client</span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1A1A1A]">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" type="submit" disabled={submitting || !title.trim()}>
            {submitting ? "Creating…" : "Create Report"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
