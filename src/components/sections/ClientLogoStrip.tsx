"use client";

import { useState } from "react";

interface Client {
  name: string;
  src: string;
}

const CLIENTS: Client[] = [
  { name: "Safaricom", src: "/images/clients/safaricom.png" },
  { name: "Bidco Africa", src: "/images/clients/bidco.png" },
  { name: "Twiga Foods", src: "" },
  { name: "Naivas", src: "" },
  { name: "Java House", src: "/images/clients/java.png" },
  { name: "Haco Industries", src: "/images/clients/haco.png" },
];

function LogoImg({ client }: { client: Client }) {
  const [failed, setFailed] = useState(false);

  if (!client.src || failed) {
    return (
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.2rem, 2.5vw, 2rem)",
          fontWeight: 700,
          color: "var(--pm-black)",
          opacity: 0.25,
          whiteSpace: "nowrap",
        }}
      >
        {client.name}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={client.src}
      alt={client.name}
      onError={() => setFailed(true)}
      style={{
        height: "clamp(24px, 3vw, 36px)",
        width: "auto",
        opacity: 0.4,
        filter: "grayscale(1)",
        transition: "opacity 300ms ease, filter 300ms ease",
        objectFit: "contain",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.filter = "grayscale(0)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "0.4";
        e.currentTarget.style.filter = "grayscale(1)";
      }}
    />
  );
}

export function ClientLogoStrip() {
  return (
    <div className="py-16" style={{ position: "relative" }}>
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
          className="flex items-center gap-16"
          style={{
            width: "fit-content",
            animation: "pm-marquee-scroll 30s linear infinite",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = "paused")}
          onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = "running")}
        >
          {[...CLIENTS, ...CLIENTS].map((client, i) => (
            <LogoImg key={`${client.name}-${i}`} client={client} />
          ))}
        </div>
      </div>
    </div>
  );
}
