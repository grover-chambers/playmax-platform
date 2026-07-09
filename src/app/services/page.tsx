import {
  Search,
  Star,
  MapPin,
  Tent,
  TrendingUp,
  Megaphone,
  ArrowRight,
} from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/layout";
import { LeadForm } from "@/components/lead-form";

const services = [
  {
    icon: Search,
    name: "Market Research",
    tagline: "Know before you go",
    desc: "Deep-dive consumer surveys, competitor mapping, and market sizing for any niche you want to enter or dominate. We combine quantitative data with qualitative insight to give you a full picture of the opportunity.",
    details: [
      "Consumer profiling & segmentation",
      "Competitor landscape mapping",
      "Market sizing & demand estimation",
      "Pricing research & willingness-to-pay studies",
      "Channel audit & distribution analysis",
    ],
  },
  {
    icon: Star,
    name: "Brand Strategy & Identity",
    tagline: "Built on research, not guesswork",
    desc: "Positioning, naming, and visual identity for new products and brands built on real research, not guesswork. We create brands that resonate with East African consumers.",
    details: [
      "Brand positioning & architecture",
      "Naming & tagline development",
      "Visual identity & logo design",
      "Brand guidelines & toolkits",
      "Packaging design & shelf strategy",
    ],
  },
  {
    icon: MapPin,
    name: "Outdoor Media",
    tagline: "Own the streets",
    desc: "Billboards, digital screens, and banner sites across Nairobi and environs — available to rent by the week or month. Every site is vetted for visibility, traffic, and audience relevance.",
    details: [
      "Static billboards (all sizes)",
      "Digital LED screens (1080p/4K)",
      "Backlit & front-lit signage",
      "Transit advertising",
      "Site selection based on audience data",
    ],
  },
  {
    icon: Tent,
    name: "Event Activations",
    tagline: "Generate buzz and data",
    desc: "On-ground brand activations, product launches, and sampling campaigns designed to generate buzz and data. Every activation is measured.",
    details: [
      "Product launch events",
      "In-store activations & sampling",
      "Experiential marketing campaigns",
      "Campus & mall activations",
      "Data capture & lead generation",
    ],
  },
  {
    icon: TrendingUp,
    name: "Data & Analytics",
    tagline: "From raw data to edge",
    desc: "We don't just collect — we interpret. Turn raw survey and market data into clear competitive advantages.",
    details: [
      "Market intelligence dashboards",
      "Consumer sentiment tracking",
      "Campaign performance analytics",
      "Sales data & trend analysis",
      "Custom research reports",
    ],
  },
  {
    icon: Megaphone,
    name: "Campaign Management",
    tagline: "One brief, every channel",
    desc: "End-to-end ad campaign production and placement — digital, print, OOH, or integrated.",
    details: [
      "Multi-channel campaign planning",
      "Creative production",
      "Media buying & placement",
      "OOH campaign management",
      "Performance tracking & optimization",
    ],
  },
];

export default function ServicesPage() {
  return (
    <>
      <SiteHeader />

      <section className="bg-transparent" style={{ color: "var(--pm-white)" }}>
        <div className="site-container pt-28 md:pt-36 pb-12 md:pb-16">
          <div className="pm-eyebrow mb-3 md:mb-4">Our Services</div>
          <h1 className="pm-hero-title mb-6 md:mb-8">
            Full-spectrum market
            <br />
            <span className="pm-accent">intelligence & activation</span>
          </h1>
          <p className="pm-hero-sub max-w-[560px]">
            From the first research question to your brand appearing on
            Nairobi&apos;s busiest streets — we handle every step.
          </p>
        </div>
      </section>

      {services.map((svc, i) => {
        // Alternate text colors based on gradient position
        const isLightSection = i >= 3; // services 4, 5, 6 are in lighter gradient area
        return (
          <section
            key={svc.name}
            className="bg-transparent"
            style={{
              color: isLightSection ? "var(--pm-black)" : "var(--pm-white)",
            }}
          >
            <div className="site-container section">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20">
                <div>
                  <div className="pm-service-icon !mb-6 md:!mb-8">
                    <svc.icon className="w-6 h-6 text-black" />
                  </div>
                  <div className="pm-eyebrow mb-3 md:mb-4">{svc.tagline}</div>
                  <h2 className="pm-section-title mb-4 md:mb-6">{svc.name}</h2>
                  <p className="pm-body-sm">{svc.desc}</p>
                </div>
                <div>
                  <div className="pm-eyebrow !text-dimmer mb-4 md:mb-6">
                    What&apos;s included
                  </div>
                  <ul className="flex flex-col gap-3 md:gap-4">
                    {svc.details.map((d) => (
                      <li key={d} className="flex items-start gap-3 pm-body-sm">
                        <span className="mt-2 w-1.5 h-1.5 bg-yellow rounded-full flex-shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="/contact"
                    className="inline-flex items-center gap-2 mt-8 md:mt-10 font-display text-[13px] font-semibold text-yellow pm-link-underline"
                  >
                    Enquire about {svc.name} <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      <section className="bg-transparent" style={{ color: "var(--pm-black)" }}>
        <div className="site-container section">
          <div className="max-w-[500px] mx-auto text-center">
            <div
              className="pm-eyebrow mb-3 md:mb-4"
              style={{ color: "var(--pm-amber)" }}
            >
              Get Started
            </div>
            <h2 className="pm-section-title mb-4 md:mb-6">
              Not sure which service?
            </h2>
            <p className="pm-hero-sub mb-8 md:mb-10">
              Tell us your goal and we&apos;ll recommend the right approach.
            </p>
            <LeadForm source="services-page" />
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
