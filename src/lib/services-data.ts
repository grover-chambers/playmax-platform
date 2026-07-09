/**
 * Single source of truth for all service slugs, names, and content.
 * Used by homepage services grid, /services/[slug] route, and navigation.
 */
export const SERVICES = [
  {
    slug: "market-research",
    name: "Market Research",
    tagline: "Know your market before you enter it",
    desc: "Deep-dive consumer surveys, competitor mapping, and market sizing for any niche you want to enter or dominate. We combine quantitative data with qualitative insight to give you a full picture of the opportunity.",
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
