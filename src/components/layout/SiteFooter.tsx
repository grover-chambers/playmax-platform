"use client";

const FOOTER_COLS = [
  {
    title: "Services",
    links: [
      "Market Research",
      "Brand Strategy",
      "Outdoor Media",
      "Event Activations",
      "Data & Analytics",
    ],
  },
  {
    title: "Company",
    links: ["About Us", "Case Studies", "Insights", "Careers"],
  },
  {
    title: "Media Inventory",
    links: ["Available Sites", "Billboards", "Digital Screens", "Banner Sites"],
  },
  {
    title: "Contact",
    links: [
      "+254 700 000 000",
      "hello@playmaxagency.co.ke",
      "Westlands, Nairobi",
    ],
  },
];

export function SiteFooter() {
  return (
    <footer
      style={{
        background: "var(--pm-black)",
        borderTop: "1px solid #1A1A1A",
      }}
    >
      {/* Tagline strip */}
      <div
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
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            color: "var(--pm-yellow)",
            marginBottom: "8px",
          }}
        >
          The market is out there.
        </h2>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            color: "var(--pm-white)",
            marginBottom: "40px",
          }}
        >
          We&apos;ll find it.
        </h2>
        <a
          href="/contact"
          className="pm-btn-primary !no-underline"
          style={{ display: "inline-flex" }}
        >
          Start a project →
        </a>
      </div>

      {/* 4-col link grid */}
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
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--pm-yellow)",
                marginBottom: "16px",
              }}
            >
              {col.title}
            </p>
            {col.links.map((link) => (
              <a
                key={link}
                href="#"
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "var(--pm-gray-4)",
                  marginBottom: "10px",
                  textDecoration: "none",
                  transition: "color 150ms ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--pm-white)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--pm-gray-4)")
                }
              >
                {link}
              </a>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom bar */}
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
            fontSize: "18px",
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          PLAY<span style={{ color: "var(--pm-yellow)" }}>MAX</span>
        </div>
        <p style={{ fontSize: "12px", color: "var(--pm-gray-5)" }}>
          © 2026 PlayMax Agency. Built by{" "}
          <span style={{ color: "var(--pm-yellow)" }}>Squareroot INC</span>.
        </p>
      </div>
    </footer>
  );
}
