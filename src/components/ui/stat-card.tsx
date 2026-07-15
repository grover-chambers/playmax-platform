import React from "react";

interface StatCardProps {
  value: string;
  label: string;
  icon?: React.ElementType;
  trend?: { value: string; positive: boolean };
  className?: string;
}

function StatCard({ value, label, icon: Icon, trend, className = "" }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-150 hover:shadow-md ${className}`}
      style={{
        background: "var(--ws-surface)",
        borderColor: "var(--ws-border)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        {Icon && (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(15, 118, 110, 0.08)",
              color: "var(--pm-teal)",
            }}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
        {trend && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              color: trend.positive ? "#3D8F5A" : "#B94A48",
              background: trend.positive ? "rgba(61, 143, 90, 0.1)" : "rgba(185, 74, 72, 0.1)",
            }}
          >
            {trend.positive ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold" style={{ color: "var(--pm-navy)" }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: "var(--ws-text-muted)" }}>{label}</p>
    </div>
  );
}

export default StatCard;