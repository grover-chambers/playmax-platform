const CLIENTS = [
  "Safaricom",
  "Bidco Africa",
  "Twiga Foods",
  "Naivas",
  "Java House",
  "Haco Industries",
];

export function ClientLogoStrip() {
  return (
    <section
      className="py-16 border-y border-[#1A1A1A]"
      style={{ background: "#080808" }}
    >
      <div className="site-container">
        <p
          className="text-center mb-10"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.75rem, 1.2vw, 1rem)",
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--pm-yellow)",
          }}
        >
          Trusted by leading brands
        </p>
        <div
          className="flex items-center justify-center gap-12 flex-wrap"
          style={{ opacity: 0.4 }}
        >
          {CLIENTS.map((name) => (
            <span
              key={name}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
                fontWeight: 700,
                color: "var(--pm-white)",
                letterSpacing: "-0.03em",
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
