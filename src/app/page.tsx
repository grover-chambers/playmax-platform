import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Sparkles,
  MapPin,
  Zap,
  BarChart2,
  Megaphone,
  ArrowRight,
  Clock,
  Users,
  Lightbulb,
  Target,
  TrendingUp,
  Calendar,
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
import { InventoryBar } from "@/components/InventoryBar";
import { ScrollToTop } from "@/components/ScrollToTop";
import { SERVICES } from "@/lib/services-data";
import { getLatestArticles } from "@/lib/articles-data";

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
    coords: [-1.2671, 36.8143] as [number, number],
  },
  {
    type: "Billboard",
    name: "Mombasa Road Super-size",
    location: "Industrial Area",
    specs: "12×4m · Static",
    price: 120000,
    status: "available" as const,
    coords: [-1.3278, 36.8575] as [number, number],
  },
  {
    type: "Billboard",
    name: "CBD Upper Hill Junction",
    location: "Upper Hill",
    specs: "8×3m · Backlit",
    price: 95000,
    status: "booked" as const,
    coords: [-1.301, 36.82] as [number, number],
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
    desc: "Born and operating in Kenya. We know the streets, the retailers, the commuters, and the culture.",
  },
  {
    icon: TrendingUp,
    title: "Measured Outcomes",
    desc: "If we can't measure it, we don't do it. Every engagement has clear KPIs and transparent reporting.",
  },
];

const insightsPreview = getLatestArticles(3);

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      {/* ═══ HERO ═══════════════════════════════════ */}
      <HeroClient />

      {/* ── SERVICES STRIP (auto-scrolling marquee) ── */}
      <div className="services-strip-pm-marquee">
        <div className="services-strip-inner">
          {[...servicePills, ...servicePills].map((pill, i) => (
            <div key={`${pill}-${i}`} className="service-pill">
              {pill}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ ABOUT SECTION — dark gradient area (white text) ════ */}
      <RevealSection className="section" style={{ color: "var(--pm-white)" }}>
        <div className="container-sm">
          <div className="mb-14">
            <div className="pm-eyebrow mb-4">About Market Link</div>
            <h2 className="pm-section-title mb-6">
              We find the market.
              <br />
              <span className="pm-accent">You own it.</span>
            </h2>
            <p className="pm-hero-sub max-w-150">
              Market Link is a Kenyan market intelligence and brand
              activation firm. We help manufacturers, suppliers, and market
              entrants understand, enter, and dominate Kenyan and East African
              markets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {aboutHighlights.map((item, i) => (
              <div
                key={item.title}
                className="p-6 md:p-8 hover:border-yellow transition-colors"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(4px)",
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
              className="inline-flex items-center gap-2 font-display text-[14px] font-semibold text-yellow pm-link-underline"
            >
              Learn more about us <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </RevealSection>

      {/* ═══ SERVICES SECTION — centered, matches About layout ════ */}
      <RevealSection className="section" style={{ color: "var(--pm-white)" }}>
        <div className="container-sm">
          <div className="mb-14">
            <div className="pm-eyebrow mb-4">What We Do</div>
            <h2 className="pm-section-title mb-6">
              Full-spectrum market
              <br />
              intelligence & activation
            </h2>
            <p className="pm-hero-sub max-w-150">
              From the first research question to your brand appearing on
              Kenya&apos;s busiest streets — we handle every step.
            </p>
          </div>

          <Carousel
            itemsPerView={3}
            gap={24}
            showArrows={true}
            showDots={true}
            className="pb-8"
          >
            {SERVICES.slice(0, 6).map(({ name, slug, desc, icon }) => {
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
              className="inline-flex items-center gap-2 font-display text-[14px] font-medium text-yellow pm-link-underline"
            >
              View all services <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </RevealSection>

      {/* ═══ INVENTORY SECTION — centered, matches About layout ═══ */}
      <RevealSection className="section" style={{ color: "var(--pm-white)" }}>
        <div className="container-sm">
          <div className="mb-14">
            <div className="pm-eyebrow mb-4">Available Inventory</div>
            <h2 className="pm-section-title mb-4">
              Media sites available{" "}
              <span className="pm-accent">this month</span>
            </h2>

            <InventoryBar available={6} total={48} />
          </div>

          <Carousel
            itemsPerView={3}
            gap={24}
            showArrows={true}
            showDots={true}
            className="pb-8"
          >
            {inventoryItems.map((item) => (
              <div
                key={item.name}
                className="pm-inventory-card pm-card-hover h-full"
              >
                <InventoryCardImage
                  name={item.name}
                  location={item.location}
                  status={item.status}
                  coords={item.coords}
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
                    className={`text-[12px] $
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
              className="inline-flex items-center gap-2 font-display text-[14px] font-medium text-yellow pm-link-underline"
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
              <Link
                key={post.slug}
                href={`/insights/${post.slug}`}
                className="group block"
                style={{
                  opacity: 0,
                  animation: `fade-slide-up 500ms ease-out ${i * 100}ms forwards`,
                }}
              >
                <div
                  className="pm-dash-card overflow-hidden h-full flex flex-col"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <div
                    className="relative overflow-hidden"
                    style={{ height: "160px" }}
                  >
                    <Image
                      src={post.imageUrl}
                      alt={post.imageAlt}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      style={{ objectFit: "cover" }}
                      className="transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6 md:p-8 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="pm-eyebrow">{post.category}</span>
                      <span className="flex items-center gap-1 text-[11px] text-gray-5">
                        <Clock className="w-3 h-3" /> {post.readTime}
                      </span>
                    </div>
                    <h3 className="pm-dash-card-t mb-3 leading-snug group-hover:text-yellow transition-colors">
                      {post.title}
                    </h3>
                    <p className="pm-body-sm mb-4 flex-1">{post.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] text-gray-5 font-mono">
                        <Calendar className="w-3 h-3 inline mr-1 -mt-0.5" />
                        {new Date(post.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <span className="text-[12px] font-medium text-yellow opacity-0 group-hover:opacity-100 transition-opacity">
                        Read more →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/insights"
              className="inline-flex items-center gap-2 font-display text-[14px] font-medium text-yellow pm-link-underline"
            >
              View all insights <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-16 md:mt-20">
            <div className="pm-dash-card max-w-[540px] mx-auto text-center p-10">
              <div className="text-[17px] md:text-[19px] font-semibold mb-2">
                Subscribe to insights
              </div>
              <p className="pm-body-sm mb-6">
                Get our latest research and analysis delivered to your inbox.
              </p>
              <a
                href="/contact"
                className="pm-btn-primary !text-[14px] !px-6 !py-2.5 no-underline"
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
                  { label: "Email", value: "hello@marketlink.co.ke" },
                  { label: "Office", value: "Westlands, Nairobi" },
                ].map((c) => (
                  <div key={c.label} className="flex items-center gap-3">
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
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
                      style={{ fontSize: "14px", color: "var(--pm-black)" }}
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

      <ScrollToTop />
    </>
  );
}
