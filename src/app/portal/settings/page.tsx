"use client";

import React from "react";
import { User, Bell, Shield, Palette, CreditCard, ChevronRight } from "lucide-react";
import Link from "next/link";

const settingsSections = [
  {
    icon: User,
    label: "Profile",
    desc: "Name, email, phone number",
    href: "#",
  },
  {
    icon: Bell,
    label: "Notifications",
    desc: "Email and in-app notification preferences",
    href: "#",
  },
  {
    icon: Shield,
    label: "Security",
    desc: "Password and account access",
    href: "#",
  },
  {
    icon: Palette,
    label: "Preferences",
    desc: "Theme, language, time zone",
    href: "#",
  },
  {
    icon: CreditCard,
    label: "Billing",
    desc: "Payment methods and billing history",
    href: "#",
  },
];

export default function PortalSettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold">Settings</h1>
        <p className="text-xs text-gray-4 mt-0.5">
          Manage your account and portal preferences
        </p>
      </div>

      <div className="max-w-2xl space-y-1">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.label}
              href={section.href}
              className="flex items-center gap-4 pm-dash-card pm-dash-card-b hover:border-yellow/20 transition-colors group no-underline"
            >
              <div className="w-10 h-10 rounded-lg bg-yellow/10 border border-yellow/20 flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-yellow" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-white group-hover:text-teal transition-colors">
                  {section.label}
                </div>
                <div className="text-[11px] text-gray-5 mt-0.5">
                  {section.desc}
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-5 group-hover:text-teal transition-colors flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
