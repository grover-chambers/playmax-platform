"use client";

import React from "react";

interface FilterPillProps {
  active?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

function FilterPill({
  active = false,
  onClick,
  className = "",
  children,
}: FilterPillProps) {
  return (
    <button
      className={`filter-pill ${active ? "active" : ""} ${className}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

export default FilterPill;
