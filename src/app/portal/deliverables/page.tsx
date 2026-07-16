"use client";

import React, { useState, useEffect, startTransition } from "react";
import Button from "@/components/ui/button";
import { FileText, Presentation, BarChart3, Image, Download, Loader2 } from "lucide-react";

interface Deliverable {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  project: string | null;
  created_at: string;
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

export default function PortalDeliverablesPage() {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-teal" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold">Deliverables</h1>
        <p className="text-xs text-gray-4 mt-0.5">
          {deliverables.length} file{deliverables.length !== 1 ? "s" : ""} across your projects
        </p>
      </div>

      {deliverables.length === 0 ? (
        <div className="pm-dash-card pm-dash-card-b text-center text-[13px] text-gray-4">
          No deliverables available yet
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {deliverables.map((d) => {
            const Icon = typeIcons[d.type] || FileText;
            return (
              <div
                key={d.id}
                className="pm-dash-card pm-dash-card-b flex items-start justify-between"
              >
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
                      <span className="text-[10px] text-gray-5 font-mono">
                        {new Date(d.created_at).toLocaleDateString("en-GB")}
                      </span>
                      <span className="text-[10px] text-gray-5 font-mono">{formatSize(d.size)}</span>
                    </div>
                  </div>
                </div>
                {d.url && (
                  <a href={d.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" size="sm">
                      <Download size={12} className="mr-1.5" /> Download
                    </Button>
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
