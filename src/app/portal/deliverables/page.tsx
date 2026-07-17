"use client";

import React, { useState, useEffect, startTransition } from "react";
import Button from "@/components/ui/button";
import PageHeader from "@/components/layout/page-header";
import { FileText, Presentation, BarChart3, Image, Download, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";

interface Deliverable {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  project: string | null;
  created_at: string;
  approval_status?: string;
  client_feedback?: string | null;
}

const typeIcons: Record<string, React.ElementType> = {
  pdf: FileText,
  docx: FileText,
  xlsx: Presentation,
  image: Image,
  other: BarChart3,
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PortalDeliverablesPage() {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/portal/deliverables")
      .then((r) => r.json())
      .then(({ deliverables: data }) => {
        startTransition(() => {
          setDeliverables(data || []);
          setLoading(false);
        });
      })
      .catch(() => startTransition(() => setLoading(false)));
  }, []);

  const handleApproval = async (id: string, status: "approved" | "rejected") => {
    setSubmitting((p) => ({ ...p, [id]: true }));
    try {
      await fetch(`/api/portal/deliverables/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approval_status: status,
          client_feedback: feedback[id] || null,
        }),
      });
      setDeliverables((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, approval_status: status, client_feedback: feedback[id] || null } : d,
        ),
      );
    } finally {
      setSubmitting((p) => ({ ...p, [id]: false }));
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
    <div className="page-content">
      <PageHeader
        title="Deliverables"
        subtitle={`${deliverables.length} file${deliverables.length !== 1 ? "s" : ""} across your projects`}
      />

      {deliverables.length === 0 ? (
        <div className="pm-dash-card pm-dash-card-b text-center text-[13px] text-gray-4">
          No deliverables available yet
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {deliverables.map((d) => {
            const Icon = typeIcons[d.type] || FileText;
            const needsReview = !d.approval_status || d.approval_status === "pending";
            const isExpanded = expanded[d.id];

            return (
              <div
                key={d.id}
                className="pm-dash-card pm-dash-card-b flex flex-col"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-yellow/10 border border-yellow/20 flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-yellow" />
                    </div>
                    <div>
                      <div className="font-display text-[13px] font-semibold text-white leading-tight">
                        {d.name}
                      </div>
                      {d.project && (
                        <div className="text-[11px] text-gray-5 mt-1">{d.project}</div>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-gray-5 font-mono">{formatDate(d.created_at)}</span>
                        <span className="text-[10px] text-gray-5 font-mono">{formatSize(d.size)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.url && (
                      <a href={d.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary" size="sm">
                          <Download size={12} className="mr-1.5" /> Download
                        </Button>
                      </a>
                    )}
                    {needsReview && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setExpanded((p) => ({ ...p, [d.id]: !isExpanded }))}
                      >
                        Review
                      </Button>
                    )}
                  </div>
                </div>

                {d.approval_status && d.approval_status !== "pending" && (
                  <div className={`mt-3 flex items-center gap-2 text-[11px] ${
                    d.approval_status === "approved" ? "text-teal" : "text-red"
                  }`}>
                    {d.approval_status === "approved" ? (
                      <><ThumbsUp size={12} /> Approved</>
                    ) : (
                      <><ThumbsDown size={12} /> Changes requested</>
                    )}
                    {d.client_feedback && (
                      <span className="text-gray-4 ml-1">— &ldquo;{d.client_feedback}&rdquo;</span>
                    )}
                  </div>
                )}

                {isExpanded && needsReview && (
                  <div className="mt-3 pt-3 border-t border-[#2A2A2A] space-y-2">
                    <textarea
                      placeholder="Add feedback or request changes..."
                      value={feedback[d.id] || ""}
                      onChange={(e) => setFeedback((p) => ({ ...p, [d.id]: e.target.value }))}
                      rows={2}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-[12px] text-white placeholder-gray-5 resize-none focus:outline-none focus:border-teal/50"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproval(d.id, "approved")}
                        disabled={submitting[d.id]}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-teal/10 text-teal rounded-lg border border-teal/20 hover:bg-teal/20 transition-colors disabled:opacity-50"
                      >
                        {submitting[d.id] ? <Loader2 size={11} className="animate-spin" /> : <ThumbsUp size={11} />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproval(d.id, "rejected")}
                        disabled={submitting[d.id]}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-red/10 text-red rounded-lg border border-red/20 hover:bg-red/20 transition-colors disabled:opacity-50"
                      >
                        {submitting[d.id] ? <Loader2 size={11} className="animate-spin" /> : <ThumbsDown size={11} />}
                        Request Changes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
