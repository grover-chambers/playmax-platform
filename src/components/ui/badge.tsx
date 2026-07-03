import React from "react";

type BadgeVariant =
  | "available"
  | "booked"
  | "draft"
  | "active"
  | "review"
  | "whatsapp";

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  available: "badge-available",
  booked: "badge-booked",
  draft: "badge-draft",
  active: "badge-active",
  review: "badge-review",
  whatsapp: "badge-yellow",
};

function Badge({
  variant = "available",
  className = "",
  children,
}: BadgeProps) {
  return (
    <span className={`badge ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}

export default Badge;
