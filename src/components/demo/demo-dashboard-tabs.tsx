"use client";

import React, { useState } from "react";
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
              : "bg-white/5 border border-white/10 text-gray-4 hover:text-white hover:border-white/30"
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
              : "bg-white/5 border border-white/10 text-gray-4 hover:text-white hover:border-white/30"
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
