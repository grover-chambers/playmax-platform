"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Store, Users, MapPin, Flag, AlertTriangle, ChevronRight, ExternalLink } from "lucide-react";

interface CensusData {
  outlets: { total: number; byChannel: Record<string, number>; byType: Record<string, number>; mapPins: any[] };
  visits: { total: number; totalOrders: number; totalOrderValue: number; byStatus: Record<string, number> };
  submissions: { total: number };
  reps: { total: number; byGroup: { group: string; count: number }[] };
}

export default function KaniniFieldOverviewPage() {
  const [census, setCensus] = useState<CensusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch("/api/portal/khel/census");
        const j = await res.json();
        if (!cancel) {
          if (j.error) setSyncError(j.error);
          else setCensus(j);
        }
      } catch (e) {
        if (!cancel) setSyncError(e instanceof Error ? e.message : "Failed to load field data");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-[12px] text-slate-500">Loading Kanini Field dashboard…</span>
      </div>
    );
  }

  const todayOutlets = census?.outlets.total ?? 0;
  const todayVisits = census?.visits.total ?? 0;
  const pendingSync = census?.submissions.total ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Header: MarketLink branded, Nice OS structure ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono tracking-widest uppercase text-teal-600">Field rep · Superadmin</div>
            <h1 className="text-[22px] font-bold text-slate-800 mt-1">Jambo, MarketLink</h1>
            <p className="text-[13px] text-slate-500 mt-1">Your mission and objectives for today — live field operations from Kanini Field.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500">
            <span className="px-2 py-1 rounded bg-teal-50 border border-teal-200 text-teal-700 font-mono">MarketLink</span>
            <span>× Kanini Field</span>
          </div>
        </div>
        {/* Cluster strip — from Nice OS kClusters */}
        <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-teal-50 border border-teal-200">
          <div className="px-2.5 py-1 rounded bg-white border border-teal-200 text-[11px] font-mono font-bold text-teal-700">KANINI • EAST</div>
          <div>
            <div className="text-[13px] font-bold text-slate-800">Kanini Field Cluster</div>
            <div className="text-[11px] text-slate-500">12 outlets/day · lead: Kanini Haraka</div>
          </div>
          <Link href="/app/kanini-field/team" className="ml-auto text-[11px] text-teal-600 hover:underline">
            View team →
          </Link>
        </div>
        {syncError && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
            <AlertTriangle size={16} className="text-red-600" />
            <div className="flex-1">
              <div className="text-[12px] font-semibold text-red-800">Sync failed</div>
              <div className="text-[11px] text-red-600">{syncError}</div>
            </div>
            <button onClick={() => window.location.reload()} className="text-[11px] font-medium text-red-700 hover:underline">
              Retry
            </button>
          </div>
        )}
      </div>

      {/* ── Mission banner — Ink paper from Brand.ink → MarketLink teal ── */}
      <div className="rounded-xl p-5 bg-gradient-to-br from-teal-700 to-emerald-800 text-white">
        <div className="text-[10px] tracking-widest uppercase font-mono text-teal-100">Mission</div>
        <div className="text-[18px] font-bold mt-1">Map every outlet, understand every shopper.</div>
        <div className="text-[13px] text-white/80 mt-2 leading-relaxed">Record outlets and intercepts accurately so the network team can route visits and drive activation.</div>
      </div>

      {/* ── Stats strip — KpiTile from Nice OS → MarketLink cards ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-[22px] font-bold text-slate-800">{todayOutlets.toLocaleString()}</div>
          <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">Outlets</div>
          <div className="text-[11px] text-teal-600 mt-1">Total census</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-[22px] font-bold text-teal-700">{todayVisits.toLocaleString()}</div>
          <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">Visits</div>
          <div className="text-[11px] text-amber-600 mt-1">{census?.visits.totalOrders ?? 0} orders</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-[22px] font-bold text-amber-600">{pendingSync.toLocaleString()}</div>
          <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">To sync</div>
          <div className="text-[11px] text-slate-400 mt-1">Submissions</div>
        </div>
      </div>

      {/* ── Objective card — WarmCard → MarketLink ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
          <Flag size={18} className="text-slate-800" />
        </div>
        <div>
          <div className="text-[14px] font-bold text-slate-800">Today&apos;s objective</div>
          <div className="text-[12px] text-slate-500">Complete census captures and close your day by 6 PM.</div>
        </div>
        <Link href="/app/kanini-field/submissions" className="ml-auto text-[11px] font-medium text-teal-600 hover:underline hidden sm:inline">
          View submissions →
        </Link>
      </div>

      {/* ── Tasks — _TaskRow from Nice OS → MarketLink list with tabs ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-[12px] font-bold tracking-wider uppercase text-slate-500">Tasks</div>
        <div className="mt-4 space-y-3">
          <Link href="/app/kanini-field/census" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center">
              <Store size={18} className="text-teal-700" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-bold text-slate-800">Census outlets</div>
              <div className="text-[12px] text-slate-500">{todayOutlets} captured · Ward + GPS</div>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">Now</span>
            <ChevronRight size={18} className="text-slate-400" />
          </Link>
          <Link href="/app/kanini-field/visits" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center">
              <Users size={18} className="text-teal-700" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-bold text-slate-800">Run visits</div>
              <div className="text-[12px] text-slate-500">{todayVisits} visits · {census?.reps.total ?? 0} reps</div>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">Now</span>
            <ChevronRight size={18} className="text-slate-400" />
          </Link>
          <Link href="/app/kanini-field/map" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
              <MapPin size={18} className="text-slate-600" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-bold text-slate-800">Territory map</div>
              <div className="text-[12px] text-slate-500">Ward boundaries · truck routes · GPS pins</div>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">Later</span>
            <ChevronRight size={18} className="text-slate-400" />
          </Link>
          <Link href="/app/kanini-field/submissions" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
              <Flag size={18} className="text-slate-600" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-bold text-slate-800">Close day &amp; submit</div>
              <div className="text-[12px] text-slate-500">{pendingSync} submissions pending sync</div>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">Later</span>
            <ChevronRight size={18} className="text-slate-400" />
          </Link>
        </div>
      </div>

      {/* ── Wiring note ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3">
        <div className="text-[11px] text-amber-800">
          <span className="font-bold">Wired:</span> <span className="font-mono bg-white px-1 py-0.5 rounded border">/api/portal/khel/census</span> + <span className="font-mono bg-white px-1 py-0.5 rounded border">/api/portal/khel/routes</span> · MarketLink branding, tabbed, live field data.
        </div>
        <a href="https://github.com/grover-chambers/kanini-field" target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-amber-700 hover:underline flex items-center gap-1">
          Kanini Field <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
