"use client";

"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";

interface PublishReportModalProps {
  open: boolean;
  report: {
    id: string;
    title: string;
    content: string | null;
    kind: string;
  } | null;
  onClose: () => void;
  onPublished: (doc: { id: string; name: string }) => void;
}

export default function PublishReportModal({ open, report, onClose, onPublished }: PublishReportModalProps) {
  const [title, setTitle] = useState(report?.title ?? "");
  const [body, setBody] = useState(report?.content ?? "");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  async function handlePublish() {
    if (!report) return;
    setPublishing(true);
    setError("");
    try {
      const res = await fetch(`/api/reports/${report.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || undefined, content: body.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Publish failed" }));
        throw new Error(err.error || "Publish failed");
      }
      const result = await res.json();
      onPublished(result.data);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Publish Report">
      <div className="p-6 w-[520px]">
        <h2 className="font-display text-[16px] font-bold text-white mb-4">Publish Report to Client</h2>

        {error && (
          <div className="bg-red/10 border border-red/20 text-red text-[12px] px-4 py-2.5 rounded-lg mb-4">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="font-mono text-[9px] text-gray-5 uppercase tracking-wider block mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black-3 border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-yellow/40"
              placeholder="Report title"
            />
          </div>
          <div>
            <label className="font-mono text-[9px] text-gray-5 uppercase tracking-wider block mb-1.5">Summary</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full bg-black-3 border border-[#252525] rounded-lg px-3 py-2 text-[12px] text-gray-3 outline-none focus:border-yellow/40 resize-none"
              placeholder="Report summary content..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <p className="text-[10px] text-gray-5">
            Published as hidden. Toggle visibility via the documents eye icon afterward.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handlePublish} disabled={publishing}>
              {publishing ? "Publishing..." : "Publish (hidden)"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
