"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SiteHeaderProps {
  className?: string;
}

const navLinks = [
  { label: "Services", href: "/services" },
  { label: "Inventory", href: "/inventory" },
  { label: "Case Studies", href: "/case-studies" },
  { label: "Insights", href: "/insights" },
  { label: "About", href: "/about" },
];

const LOGO_LETTERS = "PLAYMAX".split("");

function SiteHeader({ className = "" }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`site-header ${scrolled ? "site-header-shrink" : ""} ${className}`}
    >
      <Link
        href="/"
        className="site-logo"
        style={{ display: "flex", gap: "1px" }}
      >
        {LOGO_LETTERS.map((char, i) => (
          <span
            key={i}
            className={i < 4 ? "pm-bounce-letter" : "pm-bounce-max"}
            style={{ animationDelay: `${i * 0.12}s` }}
          >
            {char}
          </span>
        ))}
      </Link>

      <nav className="site-nav max-md:hidden">
        {navLinks.map((link) => (
          <Link key={link.label} href={link.href} className="site-nav-link">
            {link.label}
          </Link>
        ))}
      </nav>

      <Link
        href="/contact"
        className="btn-primary text-[14px] px-6 py-2.5 no-underline"
      >
        Get in Touch
      </Link>
    </header>
  );
}

export default SiteHeader;
