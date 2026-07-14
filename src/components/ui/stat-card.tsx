import React from "react";

interface StatCardProps {
  value: string;
  label: string;
  icon?: React.ElementType;
  className?: string;
}

function StatCard({ value, label, icon: Icon, className = "" }: StatCardProps) {
  return (
    <div className={`stat-card ${className}`}>
      {Icon ? (
        <div className="pm-dash-kl-icon">
          <Icon size={14} />
          {label}
        </div>
      ) : (
        <div className="stat-label">{label}</div>
      )}
      <div className="stat-num">{value}</div>
    </div>
  );
}

export default StatCard;
