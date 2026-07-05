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
      className="py-12 border-y border-[#1A1A1A]"
      style={{ background: "#080808" }}
    >
      <div className="site-container">
        <p
          className="text-center mb-8"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--pm-gray-5)",
          }}
        >
          Trusted by leading brands
        </p>
        <div
          className="flex items-center justify-center gap-10 flex-wrap"
          style={{ opacity: 0.35 }}
        >
          {CLIENTS.map((name) => (
            <span
              key={name}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--pm-white)",
                letterSpacing: "-0.02em",
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
