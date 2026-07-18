"use client";

import React, { useState, useEffect, startTransition, useCallback } from "react";
import {
  User,
  Bell,
  Loader2,
  Save,
  Check,
  AlertTriangle,
} from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import { usePortalClient } from "@/components/portal/portal-provider";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  company: string;
}

const NOTIF_KEYS: Record<string, string> = {
  "Deliverable ready for review": "deliverable_review",
  "Invoice sent or overdue": "invoice_overdue",
  "Project milestone reached": "milestone_reached",
  "New message from account manager": "new_message",
};

const DEFAULT_PREFS: Record<string, boolean> = {
  deliverable_review: true,
  invoice_overdue: true,
  milestone_reached: true,
  new_message: true,
};

export default function PortalSettingsPage() {
  const { client } = usePortalClient();
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    phone: "",
    company: "",
  });
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/me");
      if (!res.ok) throw new Error("Failed");
      const { client: c } = await res.json();
      startTransition(() => {
        setProfile({
          name: c?.name || "",
          email: c?.email || "",
          phone: c?.phone || "",
          company: c?.company || "",
        });
        if (c?.notification_prefs) {
          setNotifPrefs({ ...DEFAULT_PREFS, ...c.notification_prefs });
        }
        setLoading(false);
      });
    } catch {
      startTransition(() => setLoading(false));
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/portal/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (data.error) {
        startTransition(() => setSaveMsg({ type: "err", text: data.error }));
      } else {
        startTransition(() => setSaveMsg({ type: "ok", text: "Profile updated" }));
      }
    } catch {
      startTransition(() => setSaveMsg({ type: "err", text: "Failed to save" }));
    } finally {
      setSaving(false);
    }
  };

  const handleNotifToggle = async (label: string, checked: boolean) => {
    const key = NOTIF_KEYS[label];
    if (!key) return;
    const updated = { ...notifPrefs, [key]: checked };
    setNotifPrefs(updated);
    setNotifSaving(true);
    try {
      await fetch("/api/portal/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_prefs: updated }),
      });
    } catch {
      setNotifPrefs(notifPrefs);
    } finally {
      setNotifSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-teal" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />

      {saveMsg && (
        <div
          className={`pm-dash-alert mb-6 ${
            saveMsg.type === "ok" ? "pm-dash-alert-g" : "pm-dash-alert-r"
          }`}
        >
          {saveMsg.type === "ok" ? <Check size={14} /> : <AlertTriangle size={14} />}
          {saveMsg.text}
        </div>
      )}

      {/* ── Profile Section ─────────────────────────── */}
      <div className="pm-dash-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <User size={14} className="text-teal" />
          <span className="font-display text-[13px] font-semibold">Profile Information</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              className="w-full bg-[#0D0D0D] border border-[#252525] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-gray-5 focus:outline-none focus:border-teal/50 transition-colors"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              className="w-full bg-[#0D0D0D] border border-[#252525] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-gray-5 focus:outline-none focus:border-teal/50 transition-colors"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              Phone
            </label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              className="w-full bg-[#0D0D0D] border border-[#252525] rounded-lg px-3 py-2.5 text-[13px] text-white placeholder-gray-5 font-mono focus:outline-none focus:border-teal/50 transition-colors"
              placeholder="+254 7XX XXX XXX"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              Company
            </label>
            <input
              type="text"
              value={profile.company}
              readOnly
              className="w-full bg-[#0D0D0D] border border-[#252525] rounded-lg px-3 py-2.5 text-[13px] text-gray-4 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[#1A1A1A] flex items-center justify-between">
          <div className="text-[10px] text-gray-5">
            Changes are saved to your client profile
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-[12px] font-medium bg-teal text-black rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save Changes
          </button>
        </div>
      </div>

      {/* ── Notification Preferences ───────────────── */}
      <div className="pm-dash-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={14} className={`text-yellow ${notifSaving ? "opacity-50" : ""}`} />
          <span className="font-display text-[13px] font-semibold">Notifications</span>
        </div>

        <div className="space-y-3">
          {[
            { label: "Deliverable ready for review", desc: "Email when a new deliverable is submitted" },
            { label: "Invoice sent or overdue", desc: "Email when invoice status changes" },
            { label: "Project milestone reached", desc: "Email when a milestone is completed" },
            { label: "New message from account manager", desc: "In-app notification for new messages" },
          ].map((item) => {
            const key = NOTIF_KEYS[item.label];
            const checked = notifPrefs[key] ?? true;
            return (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-[#1A1A1A] last:border-0">
                <div>
                  <div className="text-[12px] text-gray-3">{item.label}</div>
                  <div className="text-[10px] text-gray-5 mt-0.5">{item.desc}</div>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => handleNotifToggle(item.label, e.target.checked)}
                    className="sr-only peer"
                    id={`notif-${key}`}
                  />
                  <label
                    htmlFor={`notif-${key}`}
                    className="w-9 h-5 bg-[#252525] rounded-full peer-checked:bg-teal transition-colors cursor-pointer block relative"
                  >
                    <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-gray-4 rounded-full peer-checked:bg-white transition-all peer-checked:translate-x-4" />
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 text-[10px] text-gray-5">
          Email notifications use the address on your profile. You can disable any at any time.
        </div>
      </div>

      {/* ── Account Info (read-only) ────────────────── */}
      <div className="pm-dash-card p-5">
        <div className="font-display text-[13px] font-semibold mb-3">Account Details</div>
        <div className="grid grid-cols-2 gap-y-2 text-[12px]">
          <span className="text-gray-5">Account Status</span>
          <span className="text-teal font-medium capitalize">{client?.status || "active"}</span>
          <span className="text-gray-5">Member Since</span>
          <span className="text-gray-3">
            {client?.created_at
              ? new Date(client.created_at).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </span>
          <span className="text-gray-5">Industry</span>
          <span className="text-gray-3 capitalize">{client?.industry || "—"}</span>
        </div>
      </div>
    </div>
  );
}
