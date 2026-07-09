"use client";

import { type ReactNode } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface RevealSectionProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: "section" | "div";
}

/**
 * A section wrapper that fades + slides up when it scrolls into view.
 * Uses IntersectionObserver internally — only renders once, no re-observer.
 */
export function RevealSection({
  children,
  className = "",
  style,
  as: Tag = "section",
}: RevealSectionProps) {
  const { ref, visible } = useScrollReveal();

  return (
    <Tag
      ref={ref}
      className={`${visible ? "pm-visible" : "pm-hidden"} ${className}`.trim()}
      style={style}
    >
      {children}
    </Tag>
  );
}
