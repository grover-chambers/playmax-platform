"use client";

import { useState } from "react";
import { BarChart3, Wheat } from "lucide-react";
import DemoPortalOverview from "@/components/demo/demo-portal-overview";
import DemoPortalAnalytics from "@/components/demo/demo-portal-analytics";

export default function DemoDashboardTabs() {
  const [tab, setTab] = useState<"overview" | "analytics">("overview");

  return (
    <div>
      {/* ── Tab bar ── */}
      <div className="flex gap-2 mb-6 justify-center">
        <button
          onClick={() => setTab("overview")}
          className={`px-5 py-2.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
            tab === "overview"
              ? "bg-yellow text-black"
              : "bg-[var(--ws-surface,#fff)] border border-[var(--ws-border,#e5e5e5)] text-gray-4 hover:text-[var(--ws-text,#1A1C23)] hover:border-[var(--ws-border,#e5e5e5)]"
          }`}
        >
          <BarChart3 size={14} className="inline mr-2 -mt-0.5" />
          Overview Dashboard
        </button>
        <button
          onClick={() => setTab("analytics")}
          className={`px-5 py-2.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
            tab === "analytics"
              ? "bg-yellow text-black"
              : "bg-[var(--ws-surface,#fff)] border border-[var(--ws-border,#e5e5e5)] text-gray-4 hover:text-[var(--ws-text,#1A1C23)] hover:border-[var(--ws-border,#e5e5e5)]"
          }`}
        >
          <Wheat size={14} className="inline mr-2 -mt-0.5" />
          Maize Analytics
        </button>
      </div>

      {/* ── Tab Content ── */}
      <div className="transition-opacity duration-300">
        {tab === "overview" ? <DemoPortalOverview /> : <DemoPortalAnalytics />}
      </div>
    </div>
  );
}
