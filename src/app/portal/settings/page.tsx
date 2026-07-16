"use client";

import React, { useState } from "react";
import {
  User,
  Bell,
  Shield,
  Palette,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import { usePortalClient } from "@/components/portal/portal-provider";
import { createClient } from "@/utils/supabase/client";

// ── Profile Section ──────────────────────────────────────────────

function ProfileSection() {
  const { client } = usePortalClient();
  const [editedName, setEditedName] = useState<string | null>(null);
  const [editedPhone, setEditedPhone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = editedName ?? client?.name ?? "";
  const phone = editedPhone ?? client?.phone ?? "";

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/portal/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Update failed" }));
        throw new Error(err.error || "Failed to update profile");
      }
      setSaved(true);
      setEditedName(null);
      setEditedPhone(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="font-mono text-[10px] text-gray-5 uppercase tracking-wider block mb-1.5">
          Full Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setEditedName(e.target.value)}
          className="form-input w-full max-w-md"
          placeholder="Your name"
        />
      </div>
      <div>
        <label className="font-mono text-[10px] text-gray-5 uppercase tracking-wider block mb-1.5">
          Email
        </label>
        <input
          type="email"
          value={client?.email || ""}
          disabled
          className="form-input w-full max-w-md opacity-60 cursor-not-allowed"
        />
        <p className="text-[10px] text-gray-5 mt-1">Email cannot be changed from here</p>
      </div>
      <div>
        <label className="font-mono text-[10px] text-gray-5 uppercase tracking-wider block mb-1.5">
          Phone
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setEditedPhone(e.target.value)}
          className="form-input w-full max-w-md"
          placeholder="+254 700 000 000"
        />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
        {saved && (
          <span className="text-[11px] text-teal flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Saved
          </span>
        )}
        {error && (
          <span className="text-[11px] text-red flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> {error}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Security Section ─────────────────────────────────────────────

function SecuritySection() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (authError) throw new Error(authError.message);
      setSaved(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Password change failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-md">
      <div>
        <label className="font-mono text-[10px] text-gray-5 uppercase tracking-wider block mb-1.5">
          New Password
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="form-input w-full"
          placeholder="Enter new password"
        />
      </div>
      <div>
        <label className="font-mono text-[10px] text-gray-5 uppercase tracking-wider block mb-1.5">
          Confirm Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="form-input w-full"
          placeholder="Confirm new password"
        />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Button variant="primary" size="sm" onClick={handlePasswordChange} disabled={saving}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
          {saving ? "Updating..." : "Change Password"}
        </Button>
        {saved && (
          <span className="text-[11px] text-teal flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Password updated
          </span>
        )}
        {error && (
          <span className="text-[11px] text-red flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> {error}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Placeholder Section ──────────────────────────────────────────

function PlaceholderSection({ description }: { description: string }) {
  return (
    <div className="py-4 text-[12px] text-gray-4">
      {description}
    </div>
  );
}

// ── Settings Section Config ──────────────────────────────────────

interface SettingsSection {
  key: string;
  icon: React.ElementType;
  label: string;
  desc: string;
  component: React.ReactNode;
}

const sections: SettingsSection[] = [
  {
    key: "profile",
    icon: User,
    label: "Profile",
    desc: "Name, email, phone number",
    component: <ProfileSection />,
  },
  {
    key: "security",
    icon: Shield,
    label: "Security",
    desc: "Password and account access",
    component: <SecuritySection />,
  },
  {
    key: "notifications",
    icon: Bell,
    label: "Notifications",
    desc: "Email and in-app notification preferences",
    component: <PlaceholderSection description="Notification preferences coming soon. You will be able to control which emails and in-app alerts you receive." />,
  },
  {
    key: "preferences",
    icon: Palette,
    label: "Preferences",
    desc: "Theme, language, time zone",
    component: <PlaceholderSection description="Theme and language settings coming soon." />,
  },
  {
    key: "billing",
    icon: CreditCard,
    label: "Billing",
    desc: "Payment methods and billing history",
    component: <PlaceholderSection description="Payment method management coming soon. View your invoices in the Invoices section." />,
  },
];

// ── Main Page ────────────────────────────────────────────────────

export default function PortalSettingsPage() {
  const [openSection, setOpenSection] = useState<string | null>("profile");

  const toggle = (key: string) => {
    setOpenSection((prev) => (prev === key ? null : key));
  };

  return (
    <div className="page-content">
      <PageHeader
        title="Settings"
        subtitle="Manage your account and portal preferences"
      />

      <div className="max-w-2xl space-y-2">
        {sections.map((section) => {
          const Icon = section.icon;
          const isOpen = openSection === section.key;
          return (
            <div key={section.key} className="pm-dash-card overflow-hidden">
              {/* Section header — clickable */}
              <button
                onClick={() => toggle(section.key)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/2 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-teal" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[var(--ws-text)]">
                    {section.label}
                  </div>
                  <div className="text-[11px] text-gray-4 mt-0.5">
                    {section.desc}
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp size={16} className="text-gray-4 flex-shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-gray-4 flex-shrink-0" />
                )}
              </button>

              {/* Section content — expandable */}
              {isOpen && (
                <div className="px-5 pb-5 border-t border-[var(--ws-border)]">
                  <div className="pt-4">
                    {section.component}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
