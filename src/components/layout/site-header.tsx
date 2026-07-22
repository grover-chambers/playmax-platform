"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

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
      <Link href="/" className="site-logo">
        <Image
          src="/marketlink-logo.png"
          alt="Market Link"
          width={160}
          height={40}
          style={{ objectFit: "contain" }}
          priority
        />
      </Link>

      <nav className="site-nav max-md:hidden">
        {navLinks.map((link) => (
          <Link key={link.label} href={link.href} className="site-nav-link">
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-[13px] font-medium text-white/70 hover:text-yellow transition-colors no-underline"
        >
          Login
        </Link>
        <Link
          href="/contact"
          className="btn-primary text-[14px] px-6 py-2.5 no-underline"
        >
          Get in Touch
        </Link>
      </div>
    </header>
  );
}

export default SiteHeader;
