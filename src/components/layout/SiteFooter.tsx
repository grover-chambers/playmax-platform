"use client";

import Link from "next/link";
import { RevealSection } from "@/components/ui/RevealSection";

const SERVICE_SLUGS: Record<string, string> = {
  "Market Research": "/services/market-research",
  "Brand Strategy": "/services/brand-strategy-identity",
  "Outdoor Media": "/services/outdoor-media",
  "Event Activations": "/services/event-activations",
  "Data & Analytics": "/services/data-analytics",
  "Campaign Management": "/services/campaign-management",
};

const FOOTER_COLS = [
  {
    title: "Services",
    links: Object.entries(SERVICE_SLUGS).map(([label, href]) => ({ label, href })),
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Case Studies", href: "/case-studies" },
      { label: "Insights", href: "/insights" },
    ],
  },
  {
    title: "Media Inventory",
    links: [
      { label: "Available Sites", href: "/inventory" },
      { label: "Billboards", href: "/inventory" },
      { label: "Digital Screens", href: "/inventory" },
      { label: "Banner Sites", href: "/inventory" },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: "+254 700 000 000", href: "tel:+254700000000" },
      { label: "hello@playmaxagency.co.ke", href: "mailto:hello@playmaxagency.co.ke" },
      { label: "Westlands, Nairobi", href: "https://maps.google.com/?q=Westlands+Nairobi" },
    ],
  },
];

const SOCIAL_LINKS = [
  { label: "Instagram", href: "#", icon: "IG" },
  { label: "LinkedIn", href: "#", icon: "IN" },
  { label: "X / Twitter", href: "#", icon: "X" },
  { label: "YouTube", href: "#", icon: "YT" },
  { label: "TikTok", href: "#", icon: "TT" },
];

export function SiteFooter() {
  return (
    <footer
      style={{
        background: "transparent",
        borderTop: "1px solid #1A1A1A",
      }}
    >
      <RevealSection
        as="div"
        className="site-container"
        style={{
          paddingTop: "80px",
          paddingBottom: "64px",
          borderBottom: "1px solid #1A1A1A",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.2rem, 5.5vw, 3.8rem)",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            color: "var(--pm-black)",
            marginBottom: "8px",
          }}
        >
          The market is out there.
        </h2>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.2rem, 5.5vw, 3.8rem)",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            color: "var(--pm-black)",
            marginBottom: "40px",
          }}
        >
          We&apos;ll find it.
        </h2>
        <Link
          href="/contact"
          className="pm-btn-primary no-underline"
          style={{ display: "inline-flex" }}
        >
          Start a project →
        </Link>
      </RevealSection>

      <div
        className="site-container"
        style={{
          paddingTop: "48px",
          paddingBottom: "48px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "32px",
          borderBottom: "1px solid #1A1A1A",
        }}
      >
        {FOOTER_COLS.map((col) => (
          <div key={col.title}>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--pm-amber)",
                marginBottom: "16px",
              }}
            >
              {col.title}
            </p>
            {col.links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                style={{
                  display: "block",
                  fontSize: "14px",
                  color: "var(--pm-black)",
                  marginBottom: "10px",
                  textDecoration: "none",
                  transition: "color 150ms ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--pm-yellow)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--pm-black)")
                }
              >
                {link.label}
              </a>
            ))}
          </div>
        ))}
      </div>

      <div
        className="site-container"
        style={{
          paddingTop: "24px",
          paddingBottom: "32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "20px",
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          PLAY<span style={{ color: "var(--pm-yellow)" }}>MAX</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <p style={{ fontSize: "13px", color: "var(--pm-black)" }}>
            © 2026 PlayMax Agency. Built by{" "}
            <span style={{ color: "var(--pm-yellow)" }}>Squareroot INC</span>.
          </p>
          <span style={{ width: "1px", height: "14px", background: "#1A1A1A" }} />
          <a
            href="/privacy-policy"
            style={{
              fontSize: "12px",
              color: "var(--pm-black)",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--pm-yellow)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--pm-black)")}
          >
            Privacy
          </a>
          <a
            href="/cookie-policy"
            style={{
              fontSize: "12px",
              color: "var(--pm-black)",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--pm-yellow)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--pm-black)")}
          >
            Cookies
          </a>
          <a
            href="/terms"
            style={{
              fontSize: "12px",
              color: "var(--pm-black)",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--pm-yellow)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--pm-black)")}
          >
            Terms
          </a>
          <span style={{ width: "1px", height: "14px", background: "#1A1A1A" }} />
          <a
            href="/login"
            style={{
              fontSize: "12px",
              color: "var(--pm-black)",
              textDecoration: "none",
              transition: "color 150ms ease",
              fontFamily: "var(--font-body)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--pm-yellow)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--pm-black)")
            }
          >
            Login
          </a>
        </div>
      </div>

      <div
        className="site-container"
        style={{
          paddingBottom: "32px",
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        {SOCIAL_LINKS.map((s) => (
          <a
            key={s.label}
            href={s.href}
            title={s.label}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "1px solid #1A1A1A",
              fontSize: "11px",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: "var(--pm-black)",
              textDecoration: "none",
              transition: "all 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--pm-yellow)";
              e.currentTarget.style.color = "var(--pm-yellow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#1A1A1A";
              e.currentTarget.style.color = "var(--pm-black)";
            }}
          >
            {s.icon}
          </a>
        ))}
      </div>
    </footer>
  );
}
