"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";

interface NewResearchModalProps {
  open: boolean;
  onClose: () => void;
}

const clients = ["Nairobi Tech Corp", "KCB Group", "Safaricom PLC", "EcoSave Energy", "MediCare Plus"];

export default function NewResearchModal({ open, onClose }: NewResearchModalProps) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [type, setType] = useState("market_research");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !client) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Research Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
            Project Title
          </label>
          <input
            className="w-full bg-black border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-gray-5 outline-none focus:border-yellow/40"
            placeholder="e.g. Q3 Market Sentiment Analysis"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
            Client
          </label>
          <select
            className="w-full bg-black border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-yellow/40"
            value={client}
            onChange={(e) => setClient(e.target.value)}
          >
            <option value="">Select client...</option>
            {clients.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
            Research Type
          </label>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: "market_research", label: "Market Research" },
              { value: "competitor", label: "Competitor Analysis" },
              { value: "consumer", label: "Consumer Insights" },
              { value: "trend", label: "Trend Analysis" },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                className={`px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-colors ${
                  type === t.value
                    ? "bg-yellow/10 text-yellow border-yellow/30"
                    : "bg-black text-gray-4 border-[#252525] hover:border-gray-6"
                }`}
                onClick={() => setType(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Project"}
          </Button>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
