"use client";

import React from "react";
import Link from "next/link";

interface ProjectCardProps {
  id: string;
  name: string;
  client: string;
  type: string;
  status: string;
  progress: number;
  value: string;
  deadline: string;
}

const typeColors: Record<string, string> = {
  market_research: "text-blue border-blue/20",
  brand_strategy: "text-purple border-purple/20",
  billboard_campaign: "text-yellow border-yellow/20",
  event_activation: "text-green border-green/20",
  data_analytics: "text-yellow border-yellow/20",
  campaign_management: "text-yellow border-yellow/20",
  Research: "text-blue border-blue/20",
  Branding: "text-purple border-purple/20",
  Campaign: "text-yellow border-yellow/20",
  Event: "text-green border-green/20",
  Rental: "text-wa-green border-wa-green/20",
};

const typeLabels: Record<string, string> = {
  market_research: "Market Research",
  brand_strategy: "Brand Strategy",
  billboard_campaign: "Billboard Campaign",
  event_activation: "Event Activation",
  data_analytics: "Data Analytics",
  campaign_management: "Campaign Mgmt",
};

const statusStyles: Record<string, string> = {
  draft: "text-gray-5 border-gray-5/30 bg-gray-5/10",
  active: "text-green border-green/30 bg-green/10",
  in_progress: "text-blue border-blue/30 bg-blue/10",
  review: "text-yellow border-yellow/30 bg-yellow/10",
  completed: "text-green border-green/30 bg-green/10",
};

export default function ProjectCard({
  id,
  name,
  client,
  type,
  status,
  progress,
  value,
  deadline,
}: ProjectCardProps) {
  const typeColor = typeColors[type] || "text-gray-4 border-gray-5/30";
  const typeLabel = typeLabels[type] || type;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div draggable onDragStart={handleDragStart} className="cursor-grab active:cursor-grabbing">
      <Link href={`/workspace/${id}`}>
        <div className="lead-card group">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="lead-company">{name}</span>
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className={`font-mono text-[8px] font-bold px-1.5 py-[2px] rounded-full border bg-black/40 ${typeColor}`}>
              {typeLabel}
            </span>
          </div>
          <div className="text-[13px] font-semibold text-yellow mb-2">{value}</div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-yellow transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-gray-5">{progress}%</span>
          </div>
          <div className="lead-meta">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-5">{client}</span>
              <span className="text-[10px] text-gray-4">·</span>
              <span className="text-[10px] text-gray-5">{deadline}</span>
            </div>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border capitalize ${statusStyles[status] || "text-gray-5 border-gray-5/30"}`}>{status.replace(/_/g, " ")}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
