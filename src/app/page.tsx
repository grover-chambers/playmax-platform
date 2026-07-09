import Link from "next/link";
import {
  Search,
  Sparkles,
  MapPin,
  Zap,
  BarChart2,
  Megaphone,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Users,
  Lightbulb,
  Target,
  TrendingUp,
} from "lucide-react";
import { SiteHeader } from "@/components/layout";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { LeadForm } from "@/components/lead-form";
import { InventoryCardImage } from "@/components/ui/InventoryCardImage";
import { ClientLogoStrip } from "@/components/sections/ClientLogoStrip";
import { ProcessSteps } from "@/components/ui/ProcessSteps";
import { HeroClient } from "@/components/HeroClient";
import { RevealSection } from "@/components/ui/RevealSection";
import { Carousel } from "@/components/ui/Carousel";
import { SERVICES } from "@/lib/services-data";

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

const aboutHighlights = [
  {
    icon: Target,
    title: "Research-First Approach",
    desc: "Every campaign starts with data. We never guess — we survey, map, and analyze before we activate.",
  },
  {
    icon: Users,
    title: "End-to-End Ownership",
    desc: "One team handles research, strategy, creative, and street-level activation. No handoffs, no dropped balls.",
  },
  {
    icon: Lightbulb,
    title: "Local Expertise",
    desc: "Born and operating in Nairobi. We know the streets, the retailers, the commuters, and the culture.",
  },
  {
    icon: TrendingUp,
    title: "Measured Outcomes",
    desc: "If we can't measure it, we don't do it. Every engagement has clear KPIs and transparent reporting.",
  },
];

const insightsPreview = [
  {
    title: "Why Nairobi's billboard market is shifting to digital",
    category: "Industry Trends",
    date: "2026-06-18",
    readTime: "5 min read",
    excerpt:
      "The transition from static to digital OOH is accelerating — here's what it means for advertisers and media owners in Kenya.",
  },
  {
    title: "How to pick the right market research method for your product",
    category: "Research Methods",
    date: "2026-06-10",
    readTime: "8 min read",
    excerpt:
      "Not all research is created equal. We break down when to use surveys, focus groups, ethnographic studies, and data analysis.",
  },
  {
    title: "5 brand activation mistakes we see in East Africa",
    category: "Brand Strategy",
    date: "2026-05-28",
    readTime: "6 min read",
    excerpt:
      "From ignoring local context to skipping measurement — these common missteps can tank even the best-funded campaigns.",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      {/* ═══ HERO ═══════════════════════════════════ */}
      <HeroClient />

      {/* ── SERVICES STRIP ─────────────────────────── */}
      <div className="services-strip">
        {servicePills.map((pill) => (
          <div key={pill} className="service-pill">
            {pill}
          </div>
        ))}
      </div>

      {/* ═══ ABOUT SECTION — dark gradient area (white text) ════ */}
      <RevealSection className="section" style={{ color: "var(--pm-white)" }}>
        <div className="container-sm">
          <div className="mb-14">
            <div className="pm-eyebrow mb-4">About PlayMax</div>
            <h2 className="pm-section-title mb-6">
              We find the market.
              <br />
              <span className="pm-accent">You own it.</span>
            </h2>
            <p className="pm-hero-sub max-w-150">
              PlayMax Agency is a Nairobi-based market intelligence and brand
              activation firm. We help manufacturers, suppliers, and market
              entrants understand, enter, and dominate Kenyan and East African
              markets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {aboutHighlights.map((item, i) => (
              <div
                key={item.title}
                className="bg-black-3 border border-[#1A1A1A] p-6 md:p-8 hover:border-yellow transition-colors"
                style={{
                  opacity: 0,
                  animation: `fade-slide-up 500ms ease-out ${i * 100}ms forwards`,
                }}
              >
                <div className="w-10 h-10 bg-yellow text-black rounded-full flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="text-[16px] md:text-[18px] font-semibold mb-2">
                  {item.title}
                </h3>
                <p className="pm-body-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 md:mt-20 text-center">
            <Link
              href="/about"
              className="inline-flex items-center gap-2 font-display text-[13px] font-semibold text-yellow pm-link-underline"
            >
              Learn more about us <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </RevealSection>

      {/* ═══ SERVICES SECTION — dark gradient area (white text) ════ */}
      <RevealSection className="section" style={{ color: "var(--pm-white)" }}>
        <div
          className="container-sm"
          style={{
            background: "rgba(10,10,10,0.85)",
            borderRadius: "12px",
            padding: "48px 32px",
            margin: "-32px -16px",
          }}
        >
          <div className="mb-14">
            <div className="pm-eyebrow mb-4">What We Do</div>
            <h2 className="pm-section-title mb-6">
              Full-spectrum market
              <br />
              intelligence & activation
            </h2>
            <p className="pm-hero-sub max-w-150">
              From the first research question to your brand appearing on
              Nairobi&apos;s busiest streets — we handle every step.
            </p>
          </div>

          <Carousel
            itemsPerView={3}
            gap={24}
            showArrows={true}
            showDots={true}
            className="pb-8"
          >
            {SERVICES.slice(0, 6).map(({ name, slug, desc, icon }, _i) => {
              const IconComponent =
                {
                  search: Search,
                  sparkles: Sparkles,
                  "map-pin": MapPin,
                  zap: Zap,
                  "bar-chart": BarChart2,
                  megaphone: Megaphone,
                }[icon] || Search;

              return (
                <Link
                  key={name}
                  href={`/services/${slug}`}
                  className="pm-service-card group cursor-pointer block h-full"
                >
                  <div className="pm-service-icon">
                    <IconComponent
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
                      text-gray-5 group-hover:text-yellow
                      transition-colors duration-150 mt-auto pm-link-underline"
                  >
                    Learn more <ArrowRight size={12} aria-hidden="true" />
                  </div>
                </Link>
              );
            })}
          </Carousel>
          <div className="mt-8 text-center">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 font-display text-[13px] font-medium text-yellow pm-link-underline"
            >
              View all services <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </RevealSection>

      {/* ═══ INVENTORY SECTION — dark gradient area (white text) ═══ */}
      <RevealSection className="section" style={{ color: "var(--pm-white)" }}>
        <div
          className="container-sm"
          style={{
            background: "rgba(10,10,10,0.85)",
            borderRadius: "12px",
            padding: "48px 32px",
            margin: "-32px -16px",
          }}
        >
          <div className="mb-14">
            <div className="pm-eyebrow mb-4">Available Inventory</div>
            <h2 className="pm-section-title mb-4">
              Media sites available{" "}
              <span className="pm-accent">this month</span>
            </h2>

            {/* Progress bar: 6 of 48 */}
            <div className="mt-4 max-w-xs">
              <div
                className="flex items-center gap-3 text-sm"
                style={{ color: "var(--pm-gray-4)" }}
              >
                <span>6 of 48 sites available</span>
                <span style={{ color: "var(--pm-yellow)" }}>
                  · Updated daily
                </span>
              </div>
              <div className="mt-2 w-full h-1.5 bg-black-4 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow rounded-full transition-all duration-1000 ease-out"
                  style={{ width: "12.5%" }}>
                </div>
              </div>
            </div>
          </div>

          <Carousel
            itemsPerView={3}
            gap={24}
            showArrows={true}
            showDots={true}
            className="pb-8"
          >
            {inventoryItems.map((item, _i) => (
              <div
                key={item.name}
                className="pm-inventory-card pm-card-hover h-full"
              >
                <InventoryCardImage
                  name={item.name}
                  location={item.location}
                  status={item.status}
                />
                <div className="pm-inventory-card-body">
                  <div className="pm-inv-type">{item.type}</div>
                  <div className="pm-inv-name">{item.name}</div>
                  <div className="pm-inv-loc flex items-center gap-1">
                    <MapPin
                      className="w-3 h-3"
                      style={{ color: "var(--pm-gray-5)" }}
                    />
                    {item.location}
                    {item.specs && (
                      <span style={{ color: "var(--pm-gray-5)" }}>
                        · {item.specs}
                      </span>
                    )}
                  </div>
                </div>
                <div className="pm-inventory-card-footer">
                  <div className="pm-inv-price pm-inv-price-scale">
                    KES {item.price.toLocaleString()}{" "}
                    <span className="pm-inv-price-unit">/month</span>
                  </div>
                  <div
                    className={`text-[11px] $
                      item.status === "available"
                        ? "text-green pm-pulse-available"
                        : "text-gray-4"
                    }`}
                  >
                    {item.status === "available"
                      ? "Inquire →"
                      : "Join waitlist →"}
                  </div>
                </div>
              </div>
            ))}
          </Carousel>
          <div className="mt-8 text-center">
            <Link
              href="/inventory"
              className="inline-flex items-center gap-2 font-display text-[13px] font-medium text-yellow pm-link-underline"
            >
              View all inventory <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </RevealSection>

      {/* ═══ INSIGHTS SECTION — mid gradient area (white→black transition) ═══ */}
      <RevealSection className="section" style={{ color: "var(--pm-white)" }}>
        <div className="container-sm">
          <div className="mb-14">
            <div className="pm-eyebrow mb-4">Insights</div>
            <h2 className="pm-section-title mb-6">
              Thinking on the <span className="pm-accent">market</span>
            </h2>
            <p className="pm-hero-sub max-w-[560px]">
              Research, analysis, and opinion on market intelligence, brand
              strategy, and media in East Africa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {insightsPreview.map((post, i) => (
              <div
                key={post.title}
                className="pm-dash-card overflow-hidden"
                style={{
                  opacity: 0,
                  animation: `fade-slide-up 500ms ease-out ${i * 100}ms forwards`,
                }}
              >
                <div className="h-[160px] bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] flex items-center justify-center relative">
                  <ArrowUpRight className="w-8 h-8 text-gray-5" />
                </div>
                <div className="p-6 md:p-8">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="pm-eyebrow">{post.category}</span>
                    <span className="flex items-center gap-1 text-[10px] text-gray-5">
                      <Clock className="w-3 h-3" /> {post.readTime}
                    </span>
                  </div>
                  <h3 className="pm-dash-card-t mb-3 leading-snug">
                    {post.title}
                  </h3>
                  <p className="pm-body-sm mb-4">{post.excerpt}</p>
                  <div className="text-[12px] text-gray-5 font-mono">
                    {new Date(post.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 md:mt-20">
            <div className="pm-dash-card max-w-[540px] mx-auto text-center p-10">
              <div className="text-[16px] md:text-[18px] font-semibold mb-2">
                Subscribe to insights
              </div>
              <p className="pm-body-sm mb-6">
                Get our latest research and analysis delivered to your inbox.
              </p>
              <a
                href="/contact"
                className="pm-btn-primary !text-[13px] !px-6 !py-2.5 no-underline"
              >
                Get Notified
              </a>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ═══ CLIENT LOGO STRIP — mid-light gradient area (black text) ═══ */}
      <RevealSection className="section" style={{ color: "var(--pm-black)" }}>
        <ClientLogoStrip />
      </RevealSection>

      {/* ═══ GET STARTED / CONTACT — light gradient area (black text) ══════════════════ */}
      <RevealSection
        className="section"
        style={{
          color: "var(--pm-black)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Dense polka-dot texture */}
        <div className="absolute inset-0 pm-dots-dense-cta pointer-events-none z-0" />

        <div className="container-sm relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-16 md:gap-24">
            <div className="flex flex-col gap-6 justify-center">
              <div className="pm-eyebrow" style={{ color: "var(--pm-amber)" }}>
                Get Started
              </div>
              <h2 className="pm-section-title">
                Ready to find
                <br />
                your <span className="pm-accent">market?</span>
              </h2>
              <p className="pm-hero-sub">
                Tell us what you&apos;re trying to achieve. We&apos;ll respond
                within one business day with a project brief and a quote.
              </p>

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
                      style={{ fontSize: "13px", color: "var(--pm-black)" }}
                    >
                      {c.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* LeadForm already has gap-7, mt-6 breathing room */}
            <div className="bg-white/10 p-8 rounded-lg border border-white/20 backdrop-blur-sm">
              <LeadForm source="homepage" />
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ═══ FOOTER ═════════════════════════════════ */}
      <SiteFooter />
    </>
  );
}
