"use client";

import React, { useState } from "react";
import Button from "@/components/ui/button";
import Pagination, { usePagination } from "@/components/ui/pagination";
import { FileText, Presentation, BarChart3, Image, Download } from "lucide-react";

interface Deliverable {
  title: string;
  project: string;
  date: string;
  size: string;
  icon: React.ElementType;
}

const deliverables: Deliverable[] = [
  { title: "Campaign Creative Deck", project: "Campaign Expansion", date: "15 Jun 2026", size: "2.4 MB", icon: Presentation },
  { title: "Market Research Report Q1", project: "Market Research — Q1", date: "31 Mar 2026", size: "4.1 MB", icon: BarChart3 },
  { title: "Brand Guidelines v2", project: "Westlands Screen Package", date: "10 Jun 2026", size: "8.2 MB", icon: FileText },
  { title: "Screen Design Mockups", project: "Westlands Screen Package", date: "12 Jun 2026", size: "12.0 MB", icon: Image },
  { title: "Competitor Analysis Summary", project: "Market Research — Q1", date: "28 Mar 2026", size: "1.8 MB", icon: BarChart3 },
];

export default function PortalDeliverablesPage() {
  const [page, setPage] = useState(1);
  const { paginated, total } = usePagination(deliverables, page, 20);
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold">Deliverables</h1>
        <p className="text-xs text-gray-4 mt-0.5">
          {total} files across your projects
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {paginated.map((d) => {
          const Icon = d.icon;
          return (
            <div
              key={d.title}
              className="bg-black-3 border border-black-4 rounded-lg px-5 py-5 flex items-start justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-yellow/10 border border-yellow/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-yellow" />
                </div>
                <div>
                  <div className="font-display text-[13px] font-semibold text-white leading-tight">
                    {d.title}
                  </div>
                  <div className="text-[11px] text-gray-5 mt-1">
                    {d.project}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-gray-5 font-mono">
                      {d.date}
                    </span>
                    <span className="text-[10px] text-gray-5 font-mono">
                      {d.size}
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="secondary" size="sm">
                <Download size={12} className="mr-1.5" /> Download
              </Button>
            </div>
          );
        })}
      </div>
      <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
    </div>
  );
}
