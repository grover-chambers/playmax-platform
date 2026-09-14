"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Loader2,
  Users,
  MapPin,
  Signal,
  WifiOff,
  Smartphone,
  Clock,
  TrendingUp,
  Store,
  ClipboardCheck,
  Activity,
  Database,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import Avatar from "@/components/ui/avatar";
import Button from "@/components/ui/button";

interface AccessEvent {
  id: string;
  rep_email: string;
  device_id: string | null;
  event_type: string;
  app_version: string | null;
  version_code: number | null;
  created_at: string;
}

interface Visit {
  id: string;
  rep_id: string;
  retailer_id: string | null;
  outlet_id: string | null;
  batch_id: string | null;
  status: string;
  outcome: string;
  order_placed: boolean;
  order_value: number | null;
  check_in_at: string | null;
  check_out_at: string | null;
  duration_min: number | null;
  gps_lat: number | null;
  gps_lng: number | null;
  notes: string | null;
  photo_count: number | null;
  created_at: string;
}

interface Outlet {
  id: string;
  business_name: string;
  channel: string | null;
  outlet_type: string | null;
  ward: string | null;
  ward_auto: string | null;
  ward_final: string | null;
  county: string | null;
  constituency: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_final_lat: number | null;
  gps_final_lng: number | null;
  accuracy_m: number | null;
  accuracy_tier: string | null;
  source: string | null;
  snapped: boolean | null;
  distance_m: number | null;
  size_tier: string | null;
  created_at: string | null;
}

interface Intercept {
  id: string;
  enumerator_id: string;
  ward: string | null;
  ward_auto: string | null;
  ward_final: string | null;
  channel: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_final_lat: number | null;
  gps_final_lng: number | null;
  accuracy_m: number | null;
  accuracy_tier: string | null;
  source: string | null;
  snapped: boolean | null;
  captured_at: string | null;
  created_at: string | null;
}

interface Submission {
  id: string;
  enumerator_id: string;
  submission_date: string;
  outlet_count: number | null;
  visit_count: number | null;
  status: string;
  created_at: string | null;
}

interface Batch {
  id: string;
  rep_id: string;
  device_id: string | null;
  batch_number: string;
  started_at: string | null;
  submitted_at: string | null;
  synced_at: string | null;
  record_count: number | null;
  status: string;
  created_at: string | null;
}

interface LocationPing {
  id: string;
  rep_id: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  altitude_m: number | null;
  speed_kmh: number | null;
  heading_deg: number | null;
  battery_pct: number | null;
  is_charging: boolean | null;
  source: string | null;
  captured_at: string;
}

interface RepDetail {
  profile: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    zone: string | null;
    status: string;
    onRoute: boolean;
    device: string | null;
    lastSyncAt: string | null;
    wards: unknown;
    color: string | null;
    target: number | null;
    actual: number | null;
    createdAt: string | null;
  };
  today: {
    date: string;
    visits: number;
    orders: number;
    orderValue: number;
    syncAt: string | null;
    latestGps: { lat: number; lng: number; accuracy_m: number | null; captured_at: string } | null;
  };
  access_events: AccessEvent[];
  visits: Visit[];
  outlets: Outlet[];
  intercepts: Intercept[];
  submissions: Submission[];
  batches: Batch[];
  locations: LocationPing[];
  totals: { visits: number; outlets: number; intercepts: number; submissions: number; batches: number; accessEvents: number };
}

function timeAgo(ts: string | null | undefined, now: number): string {
  if (!ts) return "never";
  const diff = now - new Date(ts).getTime();
  if (diff < 0) return "just now";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtTime(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return `${d.toLocaleDateString([], { day: "2-digit", month: "short" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

function wardsLabel(wards: unknown): string {
  if (Array.isArray(wards)) return (wards as string[]).join(", ");
  if (typeof wards === "string" && wards) return wards;
  if (wards == null) return "—";
  return String(wards);
}

const OUTCOME_TONE: Record<string, string> = {
  order: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-amber-50 text-amber-800 border-amber-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  missed: "bg-slate-100 text-slate-600 border-slate-200",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  submitted: "bg-teal-50 text-teal-700 border-teal-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const TAB_LIST = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "activity", label: "Activity", icon: Clock },
  { id: "visits", label: "Visits", icon: ClipboardCheck },
  { id: "census", label: "Census", icon: Store },
  { id: "intercepts", label: "Intercepts", icon: Users },
  { id: "batches", label: "Batches", icon: Database },
  { id: "submissions", label: "Submissions", icon: TrendingUp },
] as const;

type TabId = (typeof TAB_LIST)[number]["id"];

export default function KaniniRepProfilePage() {
  const params = useParams<{ repId: string }>();
  const repId = params.repId;

  const [data, setData] = useState<RepDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");
  const [now, setNow] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDetail = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/portal/khel/monitoring/${repId}`);
      const json = await res.json();
      if (json?.error) {
        setError(json.error);
      } else {
        setData(json);
        setError(null);
        setNow(Date.now());
      }
    } catch (err) {
      console.error("Rep detail fetch error:", err);
      setError("Failed to load rep detail");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repId]);

  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchDetail(), 400);
  }, [fetchDetail]);

  useEffect(() => {
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect -- rep switch resets view; realtime is best-effort
    setData(null);
    void fetchDetail();
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/portal/khel/monitoring/stream");
      es.onopen = () => setSseConnected(true);
      es.addEventListener("change", debouncedFetch);
      es.onerror = () => setSseConnected(false);
    } catch {
      setSseConnected(false);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (es) { try { es.close(); } catch {} }
    };
  }, [fetchDetail, debouncedFetch, repId]);

  if (loading && !data) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>;
  }

  if (error && !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <AlertCircle size={32} className="mx-auto text-red-500" />
        <div className="text-[13px] font-bold text-slate-800 mt-3">Rep not found</div>
        <div className="text-[11px] text-slate-500 mt-1">{error}</div>
        <Link href="/app/kanini-field/team"><Button variant="secondary" size="sm" className="mt-4">Back to Team</Button></Link>
      </div>
    );
  }

  const p = data!.profile;
  const appVersion = data!.access_events[0]?.app_version ?? null;
  const versionCode = data!.access_events[0]?.version_code ?? null;
  const lastLogin = data!.access_events.find((e) => e.event_type === "login") ?? null;

  const ActiveIcon = TAB_LIST.find((t) => t.id === tab)!.icon;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/app/kanini-field/team"><Button variant="secondary" size="sm" className="px-2.5"><ArrowLeft size={12} /> Team</Button></Link>
          <Avatar initials={initials(p.name)} variant={data!.today.latestGps ? "yellow" : "dark"} size="md" />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
              {p.name}
              {p.onRoute && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">ON ROUTE</span>}
            </div>
            <div className="text-[11px] text-slate-500">{p.email}{p.phone ? ` · ${p.phone}` : ""} · {p.zone || "zone —"}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
              <span className={`w-2 h-2 rounded-full ${sseConnected ? "bg-green-500 animate-pulse" : "bg-amber-400"}`} />
              {sseConnected ? "SSE live" : "polling"}
            </span>
            <Button variant="secondary" size="sm" onClick={() => fetchDetail()} disabled={refreshing} className="px-3">
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Refresh
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {data!.today.latestGps && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Signal size={10} /> LIVE · {data!.today.latestGps.lat.toFixed(4)}, {data!.today.latestGps.lng.toFixed(4)} · {timeAgo(data!.today.latestGps.captured_at, now)}
            </span>
          )}
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-full border ${data!.today.visits > 0 ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
            {data!.today.visits > 0 ? <Signal size={10} /> : <WifiOff size={10} />} {data!.today.visits > 0 ? "ACTIVE" : "IDLE"} · last sync {timeAgo(p.lastSyncAt, now)}
          </span>
          {appVersion && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Smartphone size={10} /> v{appVersion}{versionCode != null ? ` (${versionCode})` : ""}
            </span>
          )}
          {lastLogin && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              <Clock size={10} /> last login {timeAgo(lastLogin.created_at, now)}
            </span>
          )}
          {data!.locations.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              <MapPin size={10} /> {data!.totals.batches} batches · {data!.locations.length} pings
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TAB_LIST.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap border transition-colors ${active ? "bg-teal-600 text-white border-teal-600 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              <Icon size={13} /> {t.label}
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{({ overview: data!.totals.visits, activity: data!.totals.accessEvents, visits: data!.totals.visits, census: data!.totals.outlets, intercepts: data!.totals.intercepts, batches: data!.totals.batches, submissions: data!.totals.submissions } as Record<string, number>)[t.id] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <ActiveIcon size={13} className="text-teal-600" />
        <span className="font-semibold text-slate-700">{TAB_LIST.find((t) => t.id === tab)!.label}</span>
        <span className="font-mono text-slate-400">— rep activity since app install ({timeAgo(p.createdAt, now)})</span>
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-[20px] font-bold text-emerald-600">{data!.today.visits}</div>
              <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">Visits today</div>
              <div className="text-[11px] text-slate-400 mt-1">{data!.today.date}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-[20px] font-bold text-amber-600">{data!.today.orders}</div>
              <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">Orders today</div>
              <div className="text-[11px] text-slate-400 mt-1">Converted</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-[20px] font-bold">KES {data!.today.orderValue.toLocaleString()}</div>
              <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">Order value</div>
              <div className="text-[11px] text-slate-400 mt-1">Field sales</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-[20px] font-bold">{data!.totals.visits}</div>
              <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">All-time visits</div>
              <div className="text-[11px] text-slate-400 mt-1">Month curr: {p.actual ?? "—"} / {p.target ?? "—"}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-[20px] font-bold text-teal-700">{data!.totals.outlets}</div>
              <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">Outlets captured</div>
              <div className="text-[11px] text-slate-400 mt-1">{data!.totals.intercepts} intercepts</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-[12px] font-semibold text-slate-800 flex items-center gap-2"><ClipboardCheck size={14} className="text-teal-600" /> Goals</div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[12px] font-medium text-slate-700">Monthly target (visits)</span>
                  <span className="text-[12px] font-mono font-bold">{p.target ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[12px] font-medium text-slate-700">Actual this month</span>
                  <span className="text-[12px] font-mono font-bold">{p.actual ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[12px] font-medium text-slate-700">Zones / wards</span>
                  <span className="text-[12px] font-mono font-bold">{wardsLabel(p.wards)}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[12px] font-medium text-slate-700">Registered on platform</span>
                  <span className="text-[12px] font-mono font-bold">{fmtTime(p.createdAt)}</span>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-[12px] font-semibold text-slate-800 flex items-center gap-2"><MapPin size={14} className="text-teal-600" /> Latest GPS</div>
              {data!.today.latestGps ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[12px] font-medium text-slate-700">Coordinates</span>
                    <span className="text-[11px] font-mono font-bold">{data!.today.latestGps.lat.toFixed(5)}, {data!.today.latestGps.lng.toFixed(5)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[12px] font-medium text-slate-700">Accuracy</span>
                    <span className="text-[11px] font-mono font-bold">{data!.today.latestGps.accuracy_m != null ? `${Math.round(data!.today.latestGps.accuracy_m)} m` : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[12px] font-medium text-slate-700">Captured</span>
                    <span className="text-[11px] font-mono font-bold">{fmtTime(data!.today.latestGps.captured_at)} ({timeAgo(data!.today.latestGps.captured_at, now)})</span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 p-6 text-center text-[12px] text-slate-400 bg-slate-50 border border-slate-200 rounded-lg">No live GPS ping yet — the rep&apos;s device has not reported a background location.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[12px] font-semibold text-slate-800 flex items-center gap-2"><Clock size={14} className="text-teal-600" /> App activity log — login / sync / open</div>
          <div className="mt-3 max-h-[520px] overflow-y-auto divide-y divide-slate-50">
            {data!.access_events.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-slate-400">No app events yet. Events are recorded when the rep opens the app, logs in, or syncs.</div>
            ) : (
              data!.access_events.map((e) => {
                const tone = e.event_type === "sync" ? "bg-teal-50 text-teal-700 border-teal-200" : e.event_type === "login" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200";
                return (
                  <div key={e.id} className="flex items-center gap-3 px-2 py-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-mono font-bold border ${tone}`}>{e.event_type.slice(0, 4)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-slate-800 capitalize">{e.event_type}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        {e.app_version && (<><Smartphone size={10} /> v{e.app_version}{e.version_code != null ? ` (${e.version_code})` : ""} ·</>)}
                        {e.device_id ? <span className="font-mono">{e.device_id.slice(0, 10)}…</span> : "no device"}
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 text-right">{fmtTime(e.created_at)}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {tab === "visits" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <ClipboardCheck size={14} className="text-teal-600" />
            <span className="text-[12px] font-bold">Visit history</span>
            <span className="ml-auto text-[11px] text-slate-400">{data!.totals.visits} total</span>
          </div>
          <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-50">
            {data!.visits.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-slate-400">No visits recorded for this rep.</div>
            ) : (
              data!.visits.map((v) => {
                const tone = OUTCOME_TONE[(v.outcome || v.status || "").toLowerCase()] || OUTCOME_TONE.completed;
                return (
                  <div key={v.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center">
                      <ClipboardCheck size={14} className="text-teal-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-slate-800 capitalize">{v.outcome || v.status || "visit"}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {fmtTime(v.check_in_at || v.created_at)} · {v.duration_min != null ? `${v.duration_min} min` : "—"}
                        {(v.notes || "").slice(0, 80) ? ` · ${v.notes!.slice(0, 80)}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-mono px-2 py-1 rounded-full border ${tone}`}>{v.order_placed ? `KES ${(v.order_value || 0).toLocaleString()}` : (v.status || "—").toUpperCase()}</span>
                      {v.gps_lat != null && <div className="text-[9px] font-mono text-slate-400 mt-1">{v.gps_lat.toFixed(4)}, {v.gps_lng?.toFixed(4)}</div>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {tab === "census" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <Store size={14} className="text-teal-600" />
            <span className="text-[12px] font-bold">Outlets discovered</span>
            <span className="ml-auto text-[11px] text-slate-400">{data!.totals.outlets} total</span>
          </div>
          <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-50">
            {data!.outlets.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-slate-400">No outlets captured yet.</div>
            ) : (
              data!.outlets.map((o) => {
                const tierTone = o.accuracy_tier === "high" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : o.accuracy_tier === "medium" ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-amber-50 text-amber-800 border-amber-200";
                return (
                  <div key={o.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center">
                      <Store size={14} className="text-teal-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-slate-800 truncate">{o.business_name || "Unnamed outlet"}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin size={11} /> {o.ward_final || o.ward_auto || o.ward || "—"} · {o.channel || "—"} · {o.outlet_type || "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-mono px-2 py-1 rounded-full border ${tierTone}`}>{o.accuracy_tier?.toUpperCase() || "—"}</span>
                      <div className="text-[9px] font-mono text-slate-400 mt-1">{fmtTime(o.created_at)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {tab === "intercepts" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <Users size={14} className="text-teal-600" />
            <span className="text-[12px] font-bold">Consumer intercepts</span>
            <span className="ml-auto text-[11px] text-slate-400">{data!.totals.intercepts} total</span>
          </div>
          <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-50">
            {data!.intercepts.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-slate-400">No intercepts recorded.</div>
            ) : (
              data!.intercepts.map((ci) => (
                <div key={ci.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                    <Users size={14} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800">{ci.channel || "channel —"}</div>
                    <div className="text-[11px] text-slate-500 truncate">{ci.ward_final || ci.ward_auto || ci.ward || "ward —"}</div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 text-right">{fmtTime(ci.captured_at || ci.created_at)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "batches" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <Database size={14} className="text-teal-600" />
            <span className="text-[12px] font-bold">Census batches</span>
            <span className="ml-auto text-[11px] text-slate-400">{data!.totals.batches} total</span>
          </div>
          <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-50">
            {data!.batches.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-slate-400">No census batches yet.</div>
            ) : (
              data!.batches.map((b) => {
                const tone = OUTCOME_TONE[b.status.toLowerCase()] || OUTCOME_TONE.draft;
                return (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                      <Database size={14} className="text-amber-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-slate-800 font-mono">#{b.batch_number}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {b.record_count} records · started {fmtTime(b.started_at)}{b.submitted_at ? ` · submitted ${fmtTime(b.submitted_at)}` : " · not submitted"}
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-1 rounded-full border ${tone}`}>{b.status.toUpperCase()}</span>
                    {b.device_id && <div className="text-[9px] font-mono text-slate-400 hidden sm:block">{b.device_id.slice(0, 8)}…</div>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {tab === "submissions" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <TrendingUp size={14} className="text-teal-600" />
            <span className="text-[12px] font-bold">Daily submissions</span>
            <span className="ml-auto text-[11px] text-slate-400">{data!.totals.submissions} total</span>
          </div>
          <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-50">
            {data!.submissions.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-slate-400">No daily submissions — the rep has not closed a day in the app.</div>
            ) : (
              data!.submissions.map((s) => {
                const tone = OUTCOME_TONE[s.status.toLowerCase()] || OUTCOME_TONE.draft;
                return (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                      <TrendingUp size={14} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-slate-800">{s.submission_date}</div>
                      <div className="text-[11px] text-slate-500 truncate">{s.outlet_count ?? 0} outlets · {s.visit_count ?? 0} visits</div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-mono px-2 py-1 rounded-full border ${tone}`}>{s.status.toUpperCase()}</span>
                      <div className="text-[9px] font-mono text-slate-400 mt-1">{fmtTime(s.created_at)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}