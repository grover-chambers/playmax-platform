"use client";

import React, { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";
import { Loader2, CheckCircle, AlertCircle, Users } from "lucide-react";

/* ── Types ─────────────────────────────────────────────── */

interface GeneralSettings {
  company_name: string;
  company_email: string;
  company_phone: string;
  whatsapp_number: string;
  timezone: string;
  currency: string;
}

interface NotificationSettings {
  email_enabled: boolean;
  slack_enabled: boolean;
  desktop_notifications: boolean;
}

interface IntegrationStatus {
  resend: boolean;
  cloudinary: boolean;
  whatsapp: boolean;
  supabase: boolean;
}

/* ── Defaults ──────────────────────────────────────────── */

const defaultGeneral: GeneralSettings = {
  company_name: "PlayMax",
  company_email: "",
  company_phone: "",
  whatsapp_number: "",
  timezone: "Africa/Nairobi",
  currency: "KES",
};

const defaultNotifications: NotificationSettings = {
  email_enabled: true,
  slack_enabled: false,
  desktop_notifications: true,
};

const defaultIntegrations: IntegrationStatus = {
  resend: false,
  cloudinary: false,
  whatsapp: false,
  supabase: true,
};

/* ── Tab config ────────────────────────────────────────── */

const tabs = ["General", "Team", "Automations", "Templates", "Integrations"];

/* ── Page Component ────────────────────────────────────── */

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("General");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [general, setGeneral] = useState<GeneralSettings>(defaultGeneral);
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications);
  const [integrations, setIntegrations] = useState<IntegrationStatus>(defaultIntegrations);
  const [automations, setAutomations] = useState<{ id: string; name: string; enabled: boolean }[]>([]);
  const [templates, setTemplates] = useState<{ id: string; name: string; type: string; updated_at: string }[]>([]);

  /* ── Load data ───────────────────────────────────────── */

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.settings) {
        if (json.settings.general) setGeneral({ ...defaultGeneral, ...json.settings.general });
        if (json.settings.notifications) setNotifications({ ...defaultNotifications, ...json.settings.notifications });
        if (json.settings.integrations) setIntegrations({ ...defaultIntegrations, ...json.settings.integrations });
      }
    } catch {
      // Settings may not exist yet — use defaults
    }
  }, []);

  const loadAutomations = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("automations")
        .select("id, name, enabled")
        .order("created_at", { ascending: false });
      setAutomations(data ?? []);
    } catch {
      setAutomations([]);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("templates")
        .select("id, name, type, updated_at")
        .order("updated_at", { ascending: false });
      setTemplates(data ?? []);
    } catch {
      setTemplates([]);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadSettings(), loadAutomations(), loadTemplates()]);
      setLoading(false);
    };
    init();
  }, [loadSettings, loadAutomations, loadTemplates]);

  /* ── Save handler ────────────────────────────────────── */

  async function saveSetting(key: string, value: unknown) {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error("Save failed");
      setFeedback({ type: "success", message: "Settings saved" });
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback({ type: "error", message: "Failed to save settings" });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSaving(false);
    }
  }

  /* ── Loading state ───────────────────────────────────── */

  if (loading) {
    return (
      <div>
        <PageHeader title="Settings" subtitle="System configuration & team management" />
        <div className="flex items-center justify-center py-24 text-gray-5">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading settings…
        </div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────── */

  return (
    <div>
      <PageHeader title="Settings" subtitle="System configuration & team management" />

      {/* Feedback toast */}
      {feedback && (
        <div
          className={`mx-7 mt-4 flex items-center gap-2 px-4 py-2.5 rounded text-[12px] font-display font-semibold ${
            feedback.type === "success"
              ? "bg-green/10 border border-green/20 text-green"
              : "bg-red/10 border border-red/20 text-red"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="w-3.5 h-3.5" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5" />
          )}
          {feedback.message}
        </div>
      )}

      {/* Tab bar */}
      <div className="border-b border-[#1E1E1E] flex">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-[13px] font-display cursor-pointer transition-colors ${
              activeTab === tab
                ? "text-yellow border-b-2 border-yellow font-semibold"
                : "text-gray-4 hover:text-white font-medium border-b-2 border-transparent"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="px-7 py-6 bg-[#0D0D0D] min-h-[calc(100vh-140px)]">

        {/* ── General Tab ─────────────────────────────── */}
        {activeTab === "General" && (
          <div className="max-w-xl space-y-5">
            <Input
              label="Company Name"
              value={general.company_name}
              onChange={(e) => setGeneral((p) => ({ ...p, company_name: e.target.value }))}
            />
            <Input
              label="Company Email"
              type="email"
              value={general.company_email}
              onChange={(e) => setGeneral((p) => ({ ...p, company_email: e.target.value }))}
            />
            <Input
              label="Company Phone"
              value={general.company_phone}
              onChange={(e) => setGeneral((p) => ({ ...p, company_phone: e.target.value }))}
            />
            <Input
              label="WhatsApp Business Number"
              value={general.whatsapp_number}
              onChange={(e) => setGeneral((p) => ({ ...p, whatsapp_number: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Timezone"
                value={general.timezone}
                onChange={(e) => setGeneral((p) => ({ ...p, timezone: e.target.value }))}
              />
              <Input
                label="Default Currency"
                value={general.currency}
                onChange={(e) => setGeneral((p) => ({ ...p, currency: e.target.value }))}
              />
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                disabled={saving}
                onClick={() => saveSetting("general", general)}
              >
                {saving ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Team Tab ────────────────────────────────── */}
        {activeTab === "Team" && (
          <div className="space-y-4">
            <div className="pm-dash-card px-5 py-8 text-center">
              <Users className="w-8 h-8 text-gray-4 mx-auto mb-3" />
              <p className="font-display text-[13px] font-semibold text-gray-3 mb-1">
                Team Management
              </p>
              <p className="text-[11px] text-gray-5 mb-4">
                Manage team members, roles, and permissions from the dedicated staff page.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.location.href = "/app/admin/staff"}
              >
                Go to Staff Management →
              </Button>
            </div>
          </div>
        )}

        {/* ── Automations Tab ─────────────────────────── */}
        {activeTab === "Automations" && (
          <div className="max-w-xl space-y-3">
            {automations.length === 0 ? (
              <div className="pm-dash-card px-5 py-8 text-center">
                <p className="text-[13px] text-gray-5">
                  No automations configured yet. Create rules in Admin → Automation.
                </p>
              </div>
            ) : (
              automations.map((automation) => (
                <div
                  key={automation.id}
                  className="pm-dash-card flex items-center justify-between px-4 py-4"
                >
                  <div className="flex-1 mr-4">
                    <p className="font-display text-[13px] font-semibold">
                      {automation.name}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAutomations((prev) =>
                        prev.map((a) =>
                          a.id === automation.id ? { ...a, enabled: !a.enabled } : a
                        )
                      );
                      saveSetting("automations", {
                        [automation.id]: !automation.enabled,
                      });
                    }}
                    className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${
                      automation.enabled ? "bg-yellow" : "bg-[#333]"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full absolute top-0.5 transition-transform ${
                        automation.enabled
                          ? "bg-white translate-x-5"
                          : "bg-gray-4 translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Templates Tab ───────────────────────────── */}
        {activeTab === "Templates" && (
          <div className="space-y-2">
            {templates.length === 0 ? (
              <div className="pm-dash-card px-5 py-8 text-center">
                <p className="text-[13px] text-gray-5">
                  No templates created yet. Templates are managed in Content → Templates.
                </p>
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="pm-dash-card flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <p className="font-display text-[13px] font-semibold">
                      {template.name}
                    </p>
                    <span className="pm-dash-bdg pm-dash-bdg-n text-[9px]">
                      {template.type}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-5 font-mono">
                    Updated {template.updated_at ? new Date(template.updated_at).toLocaleDateString() : "—"}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Notifications settings (saved under General) ── */}
        {activeTab === "General" && (
          <div className="max-w-xl mt-8 pt-6 border-t border-[#1E1E1E]">
            <h3 className="font-display text-[14px] font-bold mb-4">Notifications</h3>
            <div className="space-y-3">
              {[
                { key: "email_enabled" as const, label: "Email Notifications" },
                { key: "slack_enabled" as const, label: "Slack Notifications" },
                { key: "desktop_notifications" as const, label: "Desktop Notifications" },
              ].map((item) => (
                <div
                  key={item.key}
                  className="pm-dash-card flex items-center justify-between px-4 py-3"
                >
                  <span className="font-display text-[13px] font-semibold">{item.label}</span>
                  <button
                    onClick={() => {
                      const updated = { ...notifications, [item.key]: !notifications[item.key] };
                      setNotifications(updated);
                      saveSetting("notifications", updated);
                    }}
                    className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${
                      notifications[item.key] ? "bg-yellow" : "bg-[#333]"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full absolute top-0.5 transition-transform ${
                        notifications[item.key]
                          ? "bg-white translate-x-5"
                          : "bg-gray-4 translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
            <div className="pt-4">
              <Button
                variant="primary"
                size="sm"
                disabled={saving}
                onClick={() => saveSetting("notifications", notifications)}
              >
                {saving ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
                ) : (
                  "Save Notification Settings"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Integrations Tab ────────────────────────── */}
        {activeTab === "Integrations" && (
          <div className="max-w-xl space-y-3">
            {([
              { key: "resend" as const, label: "Resend (Email API)" },
              { key: "cloudinary" as const, label: "Cloudinary (Media)" },
              { key: "whatsapp" as const, label: "WhatsApp Business API" },
              { key: "supabase" as const, label: "Supabase" },
            ]).map((integration) => (
              <div
                key={integration.key}
                className="pm-dash-card flex items-center justify-between px-4 py-4"
              >
                <div className="flex items-center gap-3">
                  <span className="font-display text-[13px] font-semibold">
                    {integration.label}
                  </span>
                  <span
                    className={`pm-dash-bdg text-[9px] ${
                      integrations[integration.key] ? "pm-dash-bdg-g" : "pm-dash-bdg-n"
                    }`}
                  >
                    {integrations[integration.key] ? "Connected" : "Not Connected"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const updated = { ...integrations, [integration.key]: !integrations[integration.key] };
                    setIntegrations(updated);
                    saveSetting("integrations", updated);
                  }}
                  className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${
                    integrations[integration.key] ? "bg-yellow" : "bg-[#333]"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full absolute top-0.5 transition-transform ${
                      integrations[integration.key]
                        ? "bg-white translate-x-5"
                        : "bg-gray-4 translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
