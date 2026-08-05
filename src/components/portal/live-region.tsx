"use client";

import React from "react";

/**
 * Visually-hidden live region for the portal.
 *
 * Screen readers announce discrete async results (saved / marked-as-read /
 * load errors) without moving focus. Only discrete action results are
 * announced — never high-frequency updates (typing, live metrics).
 */

const REGION_ID = "portal-live-region";

let announceTimer: ReturnType<typeof setTimeout> | null = null;

export function announce(message: string) {
  if (typeof document === "undefined") return;
  const region = document.getElementById(REGION_ID);
  if (!region) return;

  // Clear first so identical consecutive messages are re-announced
  region.textContent = "";
  requestAnimationFrame(() => {
    region.textContent = message;
  });

  if (announceTimer) clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    region.textContent = "";
  }, 3000);
}

export default function LiveRegion() {
  return (
    <div
      id={REGION_ID}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="visually-hidden"
    />
  );
}
