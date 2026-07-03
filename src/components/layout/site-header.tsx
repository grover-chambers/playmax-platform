import React from "react";
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

function SiteHeader({ className = "" }: SiteHeaderProps) {
  return (
    <header className={`site-header ${className}`}>
      <Link
        href="/"
        className="site-logo text-white hover:text-yellow transition-colors duration-200"
      >
        PLAY<span className="site-logo-accent">MAX</span>
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
        className="btn-primary text-[13px] px-6 py-2.5 no-underline"
      >
        Get in Touch
      </Link>
    </header>
  );
}

export default SiteHeader;
