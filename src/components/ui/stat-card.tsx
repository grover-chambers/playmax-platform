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
      className={`ws-stat-card ${className}`}
    >
      <div className="flex items-center gap-3 mb-3">
        {Icon && (
          <div
            className="ws-stat-icon"
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
      <p className="ws-stat-value">{value}</p>
      <p className="ws-stat-label mt-1">{label}</p>
    </div>
  );
}

export default StatCard;