"use client";

import React, { useState, useEffect, startTransition } from "react";
import { CheckCircle2, Circle, Clock, Loader2, XCircle } from "lucide-react";
import { announce } from "./live-region";

interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
}

interface MilestoneTimelineProps {
  projectId?: string;
}

const statusIcon = (status: string, size = 18) => {
  switch (status) {
    case "completed": return <CheckCircle2 size={size} className="text-teal" />;
    case "in_progress": return <Clock size={size} className="text-yellow" />;
    case "cancelled": return <XCircle size={size} className="text-red" />;
    default: return <Circle size={size} className="text-gray-5" />;
  }
};

function formatDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function MilestoneTimeline({ projectId }: MilestoneTimelineProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = projectId ? `?projectId=${projectId}` : "";
    fetch(`/api/portal/milestones${params}`)
      .then((r) => r.json())
      .then(({ milestones: data }) => {
        startTransition(() => {
          setMilestones(data || []);
          setLoading(false);
        });
      })
      .catch(() => {
        startTransition(() => setLoading(false));
        announce("Failed to load milestones");
      });
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={16} className="animate-spin text-gray-4" />
      </div>
    );
  }

  if (milestones.length === 0) {
    return <div className="text-[12px] text-gray-4 py-3 text-center">No milestones yet</div>;
  }

  return (
    <div className="relative">
      <div className="absolute left-[17px] top-3 bottom-3 w-px bg-[var(--ws-border)]" />
      <div className="space-y-0">
        {milestones.map((m, i) => {
          const isLast = i === milestones.length - 1;
          return (
            <div key={m.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="relative z-10 bg-[var(--ws-surface)] p-0.5 rounded-full">
                  {statusIcon(m.status)}
                </div>
                {!isLast && <div className="flex-1 w-px bg-[var(--ws-border)]" />}
              </div>
              <div className={`pb-6 ${isLast ? "" : ""} flex-1`}>
                <div className="flex items-center gap-2">
                  <span className={`text-[13px] font-semibold ${
                    m.status === "completed" ? "text-teal" :
                    m.status === "cancelled" ? "text-red" :
                    m.status === "in_progress" ? "text-yellow" :
                    "text-gray-3"
                  }`}>
                    {m.title}
                  </span>
                  {m.due_date && (
                    <span className="text-[10px] text-gray-5 font-mono">{formatDate(m.due_date)}</span>
                  )}
                </div>
                {m.description && (
                  <div className="text-[11px] text-gray-5 mt-1 leading-relaxed">{m.description}</div>
                )}
                <div className="text-[9px] text-gray-5 font-mono mt-1 uppercase tracking-wider">
                  {m.status.replace(/_/g, " ")}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
