import Link from "next/link";
import {
  Search,
  Sparkles,
  MapPin,
  Zap,
  BarChart2,
  Megaphone,
  ArrowRight,
} from "lucide-react";
import { SiteHeader } from "@/components/layout";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { LeadForm } from "@/components/lead-form";
import { InventoryCardImage } from "@/components/ui/InventoryCardImage";
import { ClientLogoStrip } from "@/components/sections/ClientLogoStrip";
import { ProcessSteps } from "@/components/ui/ProcessSteps";

const services = [
  {
    Icon: Search,
    name: "Market Research",
    desc: "Deep-dive consumer surveys, competitor mapping, and market sizing for any niche you want to enter or dominate.",
  },
  {
    Icon: Sparkles,
    name: "Brand Strategy & Identity",
    desc: "Positioning, naming, and visual identity for new products and brands built on real research, not guesswork.",
  },
  {
    Icon: MapPin,
    name: "Outdoor Media",
    desc: "Billboards, digital screens, and banner sites across Nairobi and environs — available to rent by the week or month.",
  },
  {
    Icon: Zap,
    name: "Event Activations",
    desc: "On-ground brand activations, product launches, and sampling campaigns designed to generate buzz and data.",
  },
  {
    Icon: BarChart2,
    name: "Data & Analytics",
    desc: "Turn raw survey and market data into clear competitive advantages with our analytics team.",
  },
  {
    Icon: Megaphone,
    name: "Campaign Management",
    desc: "End-to-end ad campaign production and placement — digital, print, OOH, or integrated.",
  },
];

const servicePills = [
  "Market Research",
  "Brand Strategy",
  "Billboard Rentals",
  "Digital Screens",
  "Event Activations",
  "Data & Analytics",
  "Competitor Analysis",
  "Product Launch",
];

const inventoryItems = [
  {
    type: "Digital Screen",
    name: "Westlands Roundabout — Screen A",
    location: "Westlands, Nairobi",
    specs: "6×3m · 1080p LED",
    price: 85000,
    status: "available" as const,
  },
  {
    type: "Billboard",
    name: "Mombasa Road Super-size",
    location: "Industrial Area",
    specs: "12×4m · Static",
    price: 120000,
    status: "available" as const,
  },
  {
    type: "Billboard",
    name: "CBD Upper Hill Junction",
    location: "Upper Hill",
    specs: "8×3m · Backlit",
    price: 95000,
    status: "booked" as const,
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      {/* ── HERO (Fix 1, Fix 5) ─────────────────────────── */}
      <section className="pm-hero hero">
        <div className="hero-content relative z-10">
          <div className="eyebrow hero-eyebrow">
            Market Research · Brand Activation · Media Rentals
          </div>
          {/* Fix 5c: manual line breaks */}
          <h1 className="pm-hero-title mb-7">
            We find the
            <br />
            market. You
            <br />
            <em className="pm-accent">own it.</em>
          </h1>
          <p className="hero-sub">
            PlayMax Agency delivers end-to-end market intelligence, brand
            strategy, and physical media activation for manufacturers,
            suppliers, and market entrants.
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

        {/* Fix 1d: relative z-10 so stats sit above pseudo-elements */}
        <div className="hero-stats max-md:hidden relative z-10">
          {/* Fix 1c: pm-stat-card with yellow left border */}
          <div className="pm-stat-card">
            <div className="stat-num">120+</div>
            <div className="stat-label">Research engagements completed</div>
          </div>
          <div className="pm-stat-card">
            <div className="stat-num">48</div>
            <div className="stat-label">Media sites available now</div>
          </div>
          <div className="pm-stat-card">
            <div className="stat-num">6</div>
            <div className="stat-label">Active markets tracked</div>
          </div>
        </div>
      </section>

      {/* ── SERVICES STRIP ─────────────────────────────── */}
      <div className="services-strip">
        {servicePills.map((pill) => (
          <div key={pill} className="service-pill">
            {pill}
          </div>
        ))}
      </div>

      {/* ── SERVICES SECTION (Fix 2, Fix 5d) ───────────── */}
      <section className="section bg-black">
        <div className="container-sm">
          <div className="mb-12">
            <div className="eyebrow mb-3">What We Do</div>
            {/* Fix 5d: manual line break + pm-section-title */}
            <h2 className="pm-section-title mb-4">
              Full-spectrum market
              <br />
              intelligence &amp; activation
            </h2>
            <p className="body-copy-sm max-w-[600px]">
              From the first research question to your brand appearing on
              Nairobi&apos;s busiest streets — we handle every step.
            </p>
          </div>

          {/* Fix 2c: updated service cards with Lucide + hover lift + "Learn more" */}
          <div className="services-grid">
            {services.map(({ Icon, name, desc }) => (
              <div key={name} className="pm-service-card group cursor-pointer">
                <div className="pm-service-icon">
                  <Icon
                    size={18}
                    color="#0A0A0A"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="pm-card-title mb-2">{name}</h3>
                <p className="pm-body-sm mb-6">{desc}</p>
                <div
                  className="flex items-center gap-1.5 text-xs font-display
                    text-[var(--pm-gray-5)] group-hover:text-[var(--pm-yellow)]
                    transition-colors duration-150 mt-auto"
                >
                  Learn more <ArrowRight size={12} aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLIENT LOGO STRIP (Fix 4) ──────────────────── */}
      <ClientLogoStrip />

      {/* ── INVENTORY SECTION (Fix 3, Fix 5e) ──────────── */}
      <section className="section bg-black-2">
        <div className="container-sm">
          <div className="mb-12">
            <div className="eyebrow mb-3">Available Inventory</div>
            {/* Fix 5e: controlled line break + pm-section-title */}
            <h2 className="pm-section-title mb-2">
              Media sites available{" "}
              <span className="pm-accent">this month</span>
            </h2>
            <div className="text-[14px] text-gray-5 mt-2">
              6 of 48 sites available · Updated daily
            </div>
          </div>

          {/* Fix 3b: use InventoryCardImage + inline card markup */}
          <div className="inventory-grid">
            {inventoryItems.map((item) => (
              <div key={item.name} className="pm-inventory-card">
                <InventoryCardImage
                  name={item.name}
                  location={item.location}
                  status={item.status}
                />
                <div className="pm-inventory-card-body">
                  <div className="pm-inv-type">{item.type}</div>
                  <div className="pm-inv-name">{item.name}</div>
                  <div className="pm-inv-loc flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-5" />
                    {item.location}
                    {item.specs && (
                      <span className="text-gray-5">· {item.specs}</span>
                    )}
                  </div>
                </div>
                <div className="pm-inventory-card-footer">
                  <div className="pm-inv-price">
                    KES {item.price.toLocaleString()}{" "}
                    <span className="pm-inv-price-unit">/month</span>
                  </div>
                  <div className="text-[11px] text-gray-4">
                    {item.status === "available"
                      ? "Inquire →"
                      : "Join waitlist →"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/inventory"
            className="inline-flex items-center gap-2 mt-8 font-display text-[13px] font-medium text-yellow hover:underline"
          >
            View all inventory <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── CONTACT / GET STARTED (Fix 6) ──────────────── */}
      <section className="section bg-black">
        <div className="container-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-16 md:gap-24">
            <div className="flex flex-col gap-6 justify-center">
              <div className="eyebrow">Get Started</div>
              <h2 className="pm-section-title">
                Ready to find
                <br />
                your <span className="pm-accent">market?</span>
              </h2>
              <p className="body-copy">
                Tell us what you&apos;re trying to achieve. We&apos;ll respond
                within one business day with a project brief and a quote.
              </p>

              {/* Fix 6b: ProcessSteps + contact info */}
              <ProcessSteps />

              <div className="flex flex-col gap-3 mt-2">
                {[
                  { label: "WhatsApp", value: "+254 700 000 000" },
                  { label: "Email", value: "hello@playmaxagency.co.ke" },
                  { label: "Office", value: "Westlands, Nairobi" },
                ].map((c) => (
                  <div key={c.label} className="flex items-center gap-3">
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "9px",
                        color: "var(--pm-yellow)",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        width: "52px",
                        flexShrink: 0,
                      }}
                    >
                      {c.label}
                    </span>
                    <span
                      style={{ fontSize: "13px", color: "var(--pm-gray-3)" }}
                    >
                      {c.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <LeadForm source="homepage" />
          </div>
        </div>
      </section>

      {/* ── FOOTER (Fix 7) ──────────────────────────────── */}
      <SiteFooter />
    </>
  );
}
