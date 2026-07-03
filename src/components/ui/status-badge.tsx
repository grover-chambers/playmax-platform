import React from "react";

type StatusVariant = "active" | "review" | "draft" | "confirmed";

interface StatusBadgeProps {
  variant: StatusVariant;
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<StatusVariant, string> = {
  active: "badge-active",
  review: "badge-review",
  draft: "badge-draft",
  confirmed: "badge-active",
};

function StatusBadge({ variant, className = "", children }: StatusBadgeProps) {
  return (
    <span className={`badge ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}

export default StatusBadge;
