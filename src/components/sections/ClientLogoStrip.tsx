"use client";

const CLIENTS = [
  { name: "Safaricom", color: "#1a8b3c" },
  { name: "Bidco Africa", color: "#004a8f" },
  { name: "Twiga Foods", color: "#e57300" },
  { name: "Naivas", color: "#c41230" },
  { name: "Java House", color: "#2c1810" },
  { name: "Haco Industries", color: "#005baa" },
];

export function ClientLogoStrip() {
  return (
    <div className="py-16 pm-marquee-wrapper" style={{ position: "relative" }}>
      <p
        className="text-center mb-10"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.75rem, 1.2vw, 1rem)",
          fontWeight: 700,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--pm-amber)",
          position: "relative",
          zIndex: 1,
        }}
      >
        Trusted by leading brands
      </p>
      <div
        className="overflow-hidden"
        style={{ position: "relative", zIndex: 1 }}
      >
        <div
          className="flex gap-16 pm-marquee"
          style={{ width: "fit-content" }}
        >
          {/* Double the array so the loop is seamless */}
          {[...CLIENTS, ...CLIENTS].map((client, i) => (
            <span
              key={`${client.name}-${i}`}
              className="grayscale hover:grayscale-0"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
                fontWeight: 700,
                color: "var(--pm-black)",
                letterSpacing: "-0.03em",
                whiteSpace: "nowrap",
                opacity: 0.3,
                transition: "opacity 250ms ease, filter 250ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.3")}
            >
              {client.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
