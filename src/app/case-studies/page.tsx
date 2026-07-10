import { ArrowUpRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/layout";

const caseStudies = [
  {
    client: "Unga Group",
    title: "Repositioning a heritage brand for the modern Kenyan consumer",
    service: "Brand Strategy & Identity",
    market: "Nairobi · Mombasa · Kisumu",
    result: "23% uplift in brand recall within 6 months",
  },
  {
    client: "Java House Africa",
    title: "Market expansion research for East Africa's largest coffee chain",
    service: "Market Research",
    market: "Kenya · Uganda · Rwanda",
    result: "Informed 4 new store locations with 90% occupancy",
  },
  {
    client: "Twiga Foods",
    title: "End-to-end brand identity launch for AgriTech scale-up",
    service: "Brand Strategy & Identity",
    market: "Nairobi · Central Kenya",
    result: "Brand launched in 3 weeks, 150+ vendor sign-ups in month 1",
  },
  {
    client: "Safaricom PLC",
    title: "OOH campaign for new product rollout across 6 counties",
    service: "Campaign Management",
    market: "Nairobi · Kiambu · Nakuru · Mombasa · Kisumu · Eldoret",
    result: "2.1M impressions, 14% lift in local brand awareness",
  },
  {
    client: "Bidco Africa",
    title: "Product launch activation across 48 supermarket branches",
    service: "Event Activations",
    market: "Nairobi · Mombasa · Nakuru",
    result: "12,000 samples distributed, 340 direct leads captured",
  },
  {
    client: "Kevian Kenya",
    title: "Competitor research for bottled water market entry",
    service: "Market Research",
    market: "Nairobi · Mombasa",
    result: "Identified 3 underserved segments worth KES 120M combined",
  },
];

export default function CaseStudiesPage() {
  return (
    <>
      <SiteHeader />

      <section className="bg-transparent" style={{ color: "var(--pm-white)" }}>
        <div className="site-container pt-28 md:pt-36 pb-12 md:pb-16">
          <div className="pm-eyebrow mb-3 md:mb-4">Case Studies</div>
          <h1 className="pm-hero-title mb-6 md:mb-8">
            Results that <span className="pm-accent">speak</span>
          </h1>
          <p className="pm-hero-sub max-w-[560px]">
            Real projects, real outcomes. Here&apos;s how we&apos;ve helped
            brands find their market and own it.
          </p>
        </div>
      </section>

      <section className="bg-transparent" style={{ color: "var(--pm-white)" }}>
        <div className="site-container section">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {caseStudies.map((cs) => (
              <div key={cs.title} className="pm-dash-card p-8 md:p-10">
                <div className="pm-eyebrow mb-2 md:mb-3">{cs.service}</div>
                <div className="pm-body-sm mb-3">{cs.client}</div>
                <h3 className="pm-dash-card-t mb-4 leading-snug group-hover:text-yellow transition-colors">
                  {cs.title}
                </h3>
                <div className="text-[14px] text-gray-5 mb-3 md:mb-4">
                  {cs.market}
                </div>
                <div className="pm-dash-bdg pm-dash-bdg-g !text-[13px] !font-medium !px-3 !py-2">
                  {cs.result}
                </div>
                <div className="mt-4 md:mt-5 flex items-center gap-1 text-[12px] text-gray-4 group-hover:text-yellow transition-colors">
                  Read case study <ArrowUpRight className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 md:mt-20">
            <div className="pm-dash-card max-w-[540px] mx-auto text-center p-10">
              <div className="text-[16px] md:text-[18px] font-semibold mb-2">
                More case studies coming soon
              </div>
              <p className="pm-body-sm mb-6">
                We&apos;re preparing detailed write-ups for our most impactful
                projects. Check back soon or subscribe to get notified.
              </p>
              <a
                href="/contact"
                className="pm-btn-primary !text-[14px] !px-6 !py-2.5 no-underline"
              >
                Request a Case Study
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
