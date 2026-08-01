"use client";

import { useState, useEffect, startTransition } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";

interface NewResearchModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface ClientOption {
  id: string;
  company: string;
}

export default function NewResearchModal({ open, onClose, onCreated }: NewResearchModalProps) {
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState("market_research");
  const [value, setValue] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  useEffect(() => {
    if (!open) return;
    fetch("/api/clients")
      .then((r) => r.json())
      .then(({ data }) => {
        startTransition(() => {
          setClients(data || []);
          setLoadingClients(false);
        });
      })
      .catch(() => startTransition(() => setLoadingClients(false)));
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !clientId) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          type,
          title: title.trim(),
          value: value ? parseFloat(value) : 0,
          due_date: dueDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      onCreated();
    } catch {
      setError("Failed to create research project");
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Research Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-[11px] text-red bg-red/10 border border-red/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <div>
          <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
            Project Title
          </label>
          <input
            className="w-full ws-input rounded-lg placeholder-gray-5"
            placeholder="e.g. Q3 Market Sentiment Analysis"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
            Client
          </label>
          <select
            className="w-full ws-input rounded-lg"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          >
            <option value="">{loadingClients ? "Loading clients..." : "Select client..."}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company}
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
              { value: "competitor_analysis", label: "Competitor Analysis" },
              { value: "consumer_survey", label: "Consumer Insights" },
              { value: "brand_audit", label: "Brand Audit" },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                className={`px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-colors ${
                  type === t.value
                    ? "bg-[var(--ws-accent)]/10 text-[var(--ws-accent)] border-[var(--ws-accent)]/20"
                    : "bg-[var(--ws-surface)] text-gray-4 border-[var(--ws-border)] hover:border-gray-4"
                }`}
                onClick={() => setType(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              Value (KES)
            </label>
            <input
              type="number"
              className="w-full ws-input rounded-lg placeholder-gray-5"
              placeholder="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              Due Date
            </label>
            <input
              type="date"
              className="w-full ws-input rounded-lg"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
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
