"use client";

import React from "react";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  href?: string;
  onClick?: () => void;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  sections: NavSection[];
  activeItem?: string;
  onItemClick?: (label: string) => void;
  user?: {
    initials: string;
    name: string;
    role: string;
  };
  className?: string;
}

function Sidebar({
  sections,
  activeItem,
  onItemClick,
  user,
  className = "",
}: SidebarProps) {
  return (
    <aside className={`sidebar ${className}`}>
      <div className="sidebar-logo flex items-center gap-2">
        <span className="w-5 h-5 rounded-full border-2 border-[var(--pm-gold)] flex items-center justify-center">
          <span className="w-2 h-2 rounded-full bg-[var(--pm-gold)]" />
        </span>
        <span className="font-display text-[13px] font-bold uppercase tracking-wider text-white">
          Market Link
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="sidebar-section">{section.label}</div>
            {section.items.map((item) => {
              const isActive = activeItem === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => onItemClick?.(item.label)}
                  className={`sidebar-item w-full text-left ${isActive ? "active" : ""}`}
                >
                  <span className="sidebar-item-icon flex-shrink-0">
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="sidebar-badge">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {user && (
        <div className="sidebar-user">
          <div className="user-avatar">{user.initials}</div>
          <div className="flex-1 min-w-0">
            <div className="user-name truncate">{user.name}</div>
            <div className="user-role truncate">{user.role}</div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
