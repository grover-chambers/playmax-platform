"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Download, Eye } from "lucide-react";
import Button from "@/components/ui/button";
import PageHeader from "@/components/layout/page-header";

const savedReports = [
  { name: "Market Share by Branch — Maize Flour", client: "RAHA MILLERS", period: "Jan–Jul 2026", pages: 12, date: "13 Jul 2026" },
  { name: "Category Performance — Cooking Oil", client: "Bidco Africa", period: "Q2 2026", pages: 8, date: "10 Jul 2026" },
  { name: "Competitor Comparison — Wheat Flour", client: "AJAB FLOUR", period: "Jan–Jun 2026", pages: 6, date: "05 Jul 2026" },
];

export default function SavedReportsPage() {
  const router = useRouter();

  return (
    <div className="p-6">
      <PageHeader
        title="Saved Reports"
        subtitle="Previously generated and saved reports"
        actions={
          <Button variant="secondary" size="sm" onClick={() => router.push("/app/analytics/reports")}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to reports
          </Button>
        }
      />

      <div className="mt-5 space-y-3">
        {savedReports.length === 0 && (
          <div className="border border-[#252525] rounded-lg bg-black-3 p-10 text-center">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-5" />
            <p className="text-[13px] text-gray-5">No saved reports yet.</p>
            <p className="text-[11px] text-gray-5 mt-1">Generate a report and save it to see it here.</p>
          </div>
        )}
        {savedReports.map((r) => (
          <div
            key={r.name}
            className="flex items-center justify-between bg-black-3 border border-[#252525] rounded-lg px-5 py-4"
          >
            <div className="flex-1 min-w-0">
              <div className="font-display text-[13px] font-semibold text-white truncate">{r.name}</div>
              <div className="text-[10px] text-gray-5 mt-1">
                {r.client} · {r.period} · {r.pages} pages · Generated {r.date}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button className="p-2 hover:bg-white/5 rounded cursor-pointer">
                <Eye className="w-3.5 h-3.5 text-gray-4" />
              </button>
              <button className="p-2 hover:bg-white/5 rounded cursor-pointer">
                <Download className="w-3.5 h-3.5 text-gray-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
