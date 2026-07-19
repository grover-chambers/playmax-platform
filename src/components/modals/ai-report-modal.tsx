"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";

interface AIReportModalProps {
  open: boolean;
  project: {
    id: string;
    client_name: string | null;
    type: string;
    metadata?: { title?: string };
  } | null;
  onClose: () => void;
  onGenerated: () => void;
}

const algorithms = [
  { id: "competition", label: "Competition Matrix", enabled: true },
  { id: "category", label: "Category Analysis", enabled: true },
  { id: "branch", label: "Branch / Region Mapping", enabled: true },
  { id: "consumer", label: "Consumer Behaviour", enabled: true },
  { id: "supply_demand", label: "Supply/Demand Gap", enabled: true },
];

export default function AIReportModal({ open, project, onClose, onGenerated }: AIReportModalProps) {
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>(algorithms.map((a) => a.id));
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const toggleAlgorithm = (id: string) => {
    setSelectedAlgorithms((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  async function handleGenerate() {
    if (!project || selectedAlgorithms.length === 0) return;
    setGenerating(true);
    setProgress("Queuing analysis...");
    setError("");

    try {
      const res = await fetch("/api/research/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          algorithms: selectedAlgorithms,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start analysis");
        setGenerating(false);
        return;
      }
      setProgress("Job queued — report will be generated in the background.");
      setTimeout(() => {
        setGenerating(false);
        onGenerated();
      }, 1500);
    } catch {
      setError("Failed to start analysis");
      setGenerating(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Generate AI Report">
      <div className="space-y-4">
        {project && (
          <div className="text-[12px] text-gray-4">
            Project: <span className="text-white font-semibold">{project.metadata?.title || project.type}</span>
            {project.client_name && <> · Client: <span className="text-white">{project.client_name}</span></>}
          </div>
        )}

        <div>
          <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-2">
            Analysis Algorithms
          </label>
          <div className="space-y-2">
            {algorithms.map((alg) => (
              <label
                key={alg.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[#252525] hover:border-yellow/20 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedAlgorithms.includes(alg.id)}
                  onChange={() => toggleAlgorithm(alg.id)}
                  className="accent-yellow w-3.5 h-3.5"
                />
                <span className="text-[12px] text-gray-3">{alg.label}</span>
              </label>
            ))}
          </div>
        </div>

        {progress && (
          <div className="text-[11px] text-teal bg-teal/5 border border-teal/20 rounded-lg px-3 py-2">
            {progress}
          </div>
        )}

        {error && (
          <div className="text-[11px] text-red bg-red/10 border border-red/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="primary" onClick={handleGenerate} disabled={generating || selectedAlgorithms.length === 0}>
            {generating ? "Generating..." : "Generate Report"}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={generating}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
