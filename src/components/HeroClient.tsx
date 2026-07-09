"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CountUp } from "@/components/CountUp";

/**
 * Client-rendered hero section with animated stat counters
 * and delayed "own it" reveal. Keeps page.tsx as a Server Component.
 */
export function HeroClient() {
  const [ownItRevealed, setOwnItRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setOwnItRevealed(true), 1400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      className="pm-hero"
      style={{
        background: "transparent",
        padding: "100px 60px 80px",
        display: "grid",
        gridTemplateColumns: "1fr 420px",
        gap: "80px",
        alignItems: "center",
        minHeight: "540px",
        position: "relative",
        overflow: "hidden",
        color: "var(--pm-white)",
      }}
    >
      {/* Polka-dot texture — faded in bottom-right corner */}
      <div
        className="pm-dots-yellow-on-black pm-dots-fade-corner pointer-events-none"
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
      />

      {/* Radial yellow glow top-right */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 80% 40%, rgba(244, 195, 0, 0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div className="hero-content" style={{ position: "relative", zIndex: 1 }}>
        <div className="pm-eyebrow mb-5">
          Market Research · Brand Activation · Media Rentals
        </div>
        <h1 className="pm-hero-title mb-8">
          We find the
          <br />
          market. You
          <br />
          <span
            className={ownItRevealed ? "pm-accent" : ""}
            style={{
              display: "inline-block",
              fontStyle: "normal",
              color: ownItRevealed ? undefined : "var(--pm-gray-5)",
              transform: ownItRevealed ? "scale(1)" : "scale(0.6)",
              opacity: ownItRevealed ? 1 : 0,
              transition: "color 600ms ease, transform 800ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 500ms ease",
              transformOrigin: "left center",
            }}
          >
            own it.
          </span>
        </h1>
        <p className="pm-hero-sub mb-8">
          PlayMax Agency delivers end-to-end market intelligence, brand
          strategy, and physical media activation for manufacturers, suppliers,
          and market entrants.
        </p>
        <div className="hero-actions">
          <Link href="/contact" className="btn-primary no-underline">
            Start a Project
          </Link>
          <Link href="/case-studies" className="btn-secondary no-underline">
            View Case Studies
          </Link>
        </div>
      </div>

      {/* Stat cards with CountUp */}
      <div
        className="hero-stats max-md:hidden"
        style={{ position: "relative", zIndex: 1 }}
      >
        <div className="pm-stat-card">
          <div className="stat-num">
            <CountUp end={120} suffix="+" />
          </div>
          <div className="stat-label">Research engagements completed</div>
        </div>
        <div className="pm-stat-card">
          <div className="stat-num">
            <CountUp end={48} duration={800} />
          </div>
          <div className="stat-label">Media sites available now</div>
        </div>
        <div className="pm-stat-card">
          <div className="stat-num">
            <CountUp end={6} duration={600} />
          </div>
          <div className="stat-label">Active markets tracked</div>
        </div>
      </div>
    </section>
  );
}
