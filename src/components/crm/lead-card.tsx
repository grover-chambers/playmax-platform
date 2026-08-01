"use client";

import React from "react";
import Avatar from "@/components/ui/avatar";

interface LeadCardProps {
  company: string;
  intent: string;
  value?: string;
  time: string;
  source: string;
  assignee: string;
  highlight?: boolean;
  className?: string;
}

function LeadCard({
  company,
  intent,
  value,
  time,
  source,
  assignee,
  highlight = false,
  className = "",
}: LeadCardProps) {
  return (
    <div className={`lead-card ${highlight ? "highlighted" : ""} ${className}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="lead-company">{company}</span>
      </div>
      <span className="intent-tag mb-2">{intent}</span>
      {value && (
        <div className="value-tag text-yellow! font-bold! mb-2">{value}</div>
      )}
      <div className="lead-meta">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-5">{time}</span>
          <span className="text-[10px] text-gray-5">·</span>
          <span className="text-[10px] text-gray-4">{source}</span>
        </div>
        <Avatar initials={assignee} variant="yellow" size="sm" />
      </div>
    </div>
  );
}

export default LeadCard;
