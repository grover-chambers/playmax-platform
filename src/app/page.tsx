import Link from "next/link";
import {
  Search,
  Star,
  MapPin,
  Tent,
  TrendingUp,
  Megaphone,
  ArrowRight,
  MessageCircle,
  Mail,
} from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/layout";
import { InventoryCard } from "@/components/inventory-card";
import { LeadForm } from "@/components/lead-form";

const services = [
  {
    icon: Search,
    name: "Market Research",
    desc: "Deep-dive consumer surveys, competitor mapping, and market sizing for any niche you want to enter or dominate.",
  },
  {
    icon: Star,
    name: "Brand Strategy",
    desc: "Positioning, naming, and visual identity for new products and brands built on real research, not guesswork.",
  },
  {
    icon: MapPin,
    name: "Outdoor Media",
    desc: "Billboards, digital screens, and banner sites across Nairobi and environs — available to rent by the week or month.",
  },
  {
    icon: Tent,
    name: "Event Activations",
    desc: "On-ground brand activations, product launches, and sampling campaigns designed to generate buzz and data.",
  },
  {
    icon: TrendingUp,
    name: "Data & Analytics",
    desc: "Turn raw survey and market data into clear competitive advantages with our analytics team.",
  },
  {
    icon: Megaphone,
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

      {/* ── HERO ──────────────────────────────────── */}
      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow hero-eyebrow">
            Market Research · Brand Activation · Media Rentals
          </div>
          <h1 className="text-hero hero-title">
            We find the
            <br />
            market. You
            <br />
            <span className="accent">own it.</span>
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

        <div className="hero-stats max-md:hidden">
          <div className="stat-card">
            <div className="stat-num">120+</div>
            <div className="stat-label">Research engagements completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">48</div>
            <div className="stat-label">Media sites available now</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">6</div>
            <div className="stat-label">Active markets tracked</div>
          </div>
        </div>
      </section>

      {/* ── SERVICES STRIP ─────────────────────────── */}
      <div className="services-strip">
        {servicePills.map((pill) => (
          <div key={pill} className="service-pill">
            {pill}
          </div>
        ))}
      </div>

      {/* ── SERVICES SECTION ───────────────────────── */}
      <section className="section bg-black">
        <div className="container-sm">
          <div className="mb-12">
            <div className="eyebrow mb-3">What We Do</div>
            <h2 className="text-section mb-4">
              Full-spectrum market
              <br />
              intelligence &amp; activation
            </h2>
            <p className="body-copy-sm max-w-[600px]">
              From the first research question to your brand appearing on
              Nairobi&apos;s busiest streets — we handle every step.
            </p>
          </div>
          <div className="services-grid">
            {services.map((svc) => (
              <div key={svc.name} className="service-card">
                <div className="service-icon">
                  <svc.icon className="w-[18px] h-[18px] text-black" />
                </div>
                <div className="service-name">{svc.name}</div>
                <div className="service-desc">{svc.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INVENTORY SECTION ──────────────────────── */}
      <section className="section bg-black-2">
        <div className="container-sm">
          <div className="mb-12">
            <div className="eyebrow mb-3">Available Inventory</div>
            <h2 className="text-section">
              Media sites available <span className="accent">this month</span>
            </h2>
            <div className="text-[14px] text-gray-5 mt-2">
              6 of 48 sites available · Updated daily
            </div>
          </div>
          <div className="inventory-grid">
            {inventoryItems.map((item) => (
              <InventoryCard key={item.name} {...item} />
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

      {/* ── CONTACT / GET STARTED ───────────────────── */}
      <section className="section bg-black">
        <div className="container-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-16 md:gap-24">
            <div className="flex flex-col gap-6 justify-center">
              <div className="eyebrow">Get Started</div>
              <h2 className="text-section">
                Ready to find
                <br />
                your <span className="accent">market?</span>
              </h2>
              <p className="body-copy">
                Tell us what you&apos;re trying to achieve. We&apos;ll respond
                within one business day with a project brief and a quote.
              </p>
              <div className="flex flex-col gap-4 mt-2">
                <div className="flex items-center gap-3 text-[14px] text-gray-4">
                  <MessageCircle className="w-[18px] h-[18px] text-yellow" />
                  +254 700 000 000
                </div>
                <div className="flex items-center gap-3 text-[14px] text-gray-4">
                  <Mail className="w-[18px] h-[18px] text-yellow" />
                  hello@playmaxagency.co.ke
                </div>
                <div className="flex items-center gap-3 text-[14px] text-gray-4">
                  <MapPin className="w-[18px] h-[18px] text-yellow" />
                  Westlands, Nairobi
                </div>
              </div>
            </div>
            <LeadForm source="homepage" />
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
