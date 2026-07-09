export const SERVICES = [
  {
    slug: "market-research",
    name: "Market Research",
    tagline: "Know your market before you enter it",
    desc: "Deep-dive consumer surveys, competitor mapping, and market sizing for any niche you want to enter or dominate. We combine quantitative data with qualitative insight to give you a full picture of the opportunity.",
    longDesc:
      "We design and execute custom research programs that eliminate guesswork. Our team conducts structured consumer surveys (online, phone, or in-person), in-depth interviews, focus groups, and ethnographic studies to surface real behaviours, preferences, and pain points. We map your competitive landscape by analysing direct and indirect competitors, their pricing, distribution, and messaging. Every project delivers a market sizing model that quantifies total addressable market, serviceable addressable market, and expected share capture, so you can make resource allocation decisions with confidence.",
    icon: "search",
    whoFor: [
      "Manufacturers entering a new category",
      "Suppliers testing demand before scaling",
      "Businesses expanding into a new niche",
    ],
    deliverables: [
      "Consumer survey data",
      "Competitor mapping",
      "Market sizing report",
    ],
    processSteps: ["Discovery", "Field research", "Analysis", "Delivery"],
  },
  {
    slug: "brand-strategy-identity",
    name: "Brand Strategy & Identity",
    tagline: "Positioning and identity built on real research, not guesswork",
    desc: "Positioning, naming, and visual identity for new products and brands built on real research, not guesswork. We create brands that resonate with East African consumers.",
    longDesc:
      "We start every brand project with research — not a creative brief pulled from thin air. Before sketching a logo or writing a tagline, we interview stakeholders, survey target consumers, and audit competitor brands to identify white space in the market. From there, we craft a positioning platform that defines your brand's purpose, personality, promise, and proof. The visual identity — logo, colour palette, typography, iconography — flows directly from that strategic foundation. We deliver a comprehensive brand toolkit with usage guidelines, application mockups, and implementation support so your brand launches coherently across every touchpoint.",
    icon: "sparkles",
    whoFor: ["New product launches", "Brand repositioning", "Rebrands"],
    deliverables: ["Brand positioning", "Naming", "Visual identity system"],
    processSteps: [
      "Research review",
      "Positioning",
      "Identity design",
      "Handoff",
    ],
  },
  {
    slug: "outdoor-media",
    name: "Outdoor Media",
    tagline: "Your brand, on Nairobi's busiest streets",
    desc: "Billboards, digital screens, and banner sites across Nairobi and environs — available to rent by the week or month. Every site is vetted for visibility, traffic, and audience relevance.",
    longDesc:
      "Our outdoor media network spans prime locations across Nairobi and key Kenyan towns. We offer static billboards (various sizes from 8×3m to 12×4m), high-brightness digital LED screens (1080p and 4K), backlit signage, and banner sites. Each site is audited for daily traffic counts, audience demographics, visibility angles, and surrounding clutter so you get objective data to inform your buy. We handle end-to-end production coordination — from artwork adaptation to printing, installation, and monthly performance reporting. Short-term rentals (weekly or monthly) are available with no long-term lock-in.",
    icon: "map-pin",
    whoFor: ["Brands launching in a new market", "High-visibility campaigns"],
    deliverables: [
      "Site selection",
      "Design & production coordination",
      "Installation",
      "Monthly reporting",
    ],
    processSteps: [
      "Site scouting",
      "Design & production",
      "Installation",
      "Monthly reporting",
    ],
  },
  {
    slug: "event-activations",
    name: "Event Activations",
    tagline: "On-ground brand experiences that generate buzz and data",
    desc: "On-ground brand activations, product launches, and sampling campaigns designed to generate buzz and data. Every activation is measured.",
    longDesc:
      "We create on-ground experiences that put your brand directly in front of your target audience. Our activations range from product sampling in high-traffic retail locations to full-scale experiential events at malls, campuses, festivals, and community gatherings. Every activation is designed with data capture as a primary objective — we use digital check-ins, QR-code engagement, and real-time polling to collect qualified leads and consumer feedback. Post-event, you receive a detailed report covering footfall, samples distributed, leads captured, social media mentions, and return-on-engagement metrics so you can measure impact, not just activity.",
    icon: "zap",
    whoFor: [
      "Product launches",
      "Sampling campaigns",
      "Experiential marketing",
    ],
    deliverables: [
      "Event concept & production",
      "On-ground staffing",
      "Post-event data capture",
    ],
    processSteps: ["Concept", "Planning", "Activation", "Report"],
  },
  {
    slug: "data-analytics",
    name: "Data & Analytics",
    tagline: "Turn raw market data into competitive advantage",
    desc: "We don't just collect — we interpret. Turn raw survey and market data into clear competitive advantages.",
    longDesc:
      "Data is only valuable when it leads to a decision. We take raw data from surveys, sales records, social media, and third-party sources and transform it into structured dashboards, visual trend analyses, and actionable recommendations. Our analytics practice covers descriptive analytics (what happened), diagnostic analytics (why it happened), and prescriptive analytics (what to do next). We build custom dashboards in tools you already use (Google Sheets, Looker Studio, Power BI) or deliver static PDF reports depending on your preference. Every engagement ends with a clear set of recommended actions tied directly to the data.",
    icon: "bar-chart",
    whoFor: [
      "Clients with existing survey/market data",
      "Ongoing research subscribers",
    ],
    deliverables: [
      "Structured findings dashboard",
      "Key stats & trend cards",
      "Full analytical reports",
    ],
    processSteps: ["Data intake", "Analysis", "Visualization", "Delivery"],
  },
  {
    slug: "campaign-management",
    name: "Campaign Management",
    tagline: "End-to-end ad campaign production and placement",
    desc: "End-to-end ad campaign production and placement — digital, print, OOH, or integrated.",
    longDesc:
      "We manage the full lifecycle of advertising campaigns from concept to reporting. Our team develops the campaign strategy, produces creative assets (print, digital, OOH, radio, TV), handles media buying and placement across all channels, and monitors performance daily. For OOH campaigns specifically, we coordinate with printers, installers, and site owners to ensure your creative is live on time and in the right condition. Throughout the campaign run, we provide weekly check-in reports and make optimisation recommendations. At campaign end, you receive a comprehensive performance report with reach, frequency, cost-per-impression, and ROI analysis.",
    icon: "megaphone",
    whoFor: [
      "Brands running multi-channel campaigns",
      "Digital, print, or OOH advertisers",
    ],
    deliverables: [
      "Campaign strategy",
      "Creative production",
      "Placement & scheduling",
      "Performance reporting",
    ],
    processSteps: ["Strategy", "Production", "Placement", "Reporting"],
  },
] as const;

export type Service = (typeof SERVICES)[number];

export function getServiceBySlug(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

export function getAllServiceSlugs(): string[] {
  return SERVICES.map((s) => s.slug);
}
