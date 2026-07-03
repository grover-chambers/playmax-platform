import React from "react";

interface StatCardProps {
  value: string;
  label: string;
  className?: string;
}

function StatCard({ value, label, className = "" }: StatCardProps) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-num">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default StatCard;
