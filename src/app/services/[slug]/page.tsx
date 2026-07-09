import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Sparkles,
  MapPin,
  Zap,
  BarChart2,
  Megaphone,
  ArrowRight,
  Check,
  Users,
  Layers,
} from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/layout";
import { LeadForm } from "@/components/lead-form";
import { SERVICES, getServiceBySlug } from "@/lib/services-data";
import { InventoryMapWrapper } from "@/components/InventoryMapWrapper";

const iconMap: Record<string, typeof Search> = {
  search: Search,
  sparkles: Sparkles,
  "map-pin": MapPin,
  zap: Zap,
  "bar-chart": BarChart2,
  megaphone: Megaphone,
};

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return { title: "Service Not Found" };
  return {
    title: `${service.name} — PlayMax Agency`,
    description: service.tagline,
  };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    return notFound();
  }

  const IconComponent = iconMap[service.icon] || Search;

  return (
    <>
      <SiteHeader />

      {/* ═══ HERO ═══════════════════════════════════ */}
      <section className="bg-transparent" style={{ color: "var(--pm-white)" }}>
        <div className="site-container pt-28 md:pt-36 pb-12 md:pb-16">
          <div className="pm-eyebrow mb-3 md:mb-4">{service.name}</div>
          <h1 className="pm-hero-title mb-6 md:mb-8">{service.tagline}</h1>
          <p className="pm-hero-sub max-w-[560px]">
            {service.desc}
          </p>
        </div>
      </section>

      {/* ═══ OVERVIEW ═══════════════════════════════ */}
      <section className="bg-transparent" style={{ color: "var(--pm-white)" }}>
        <div className="site-container section">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20">
            <div>
              <div className="pm-service-icon !mb-6 md:!mb-8">
                <IconComponent className="w-6 h-6 text-black" />
              </div>
              <h2 className="pm-section-title mb-4 md:mb-6">Overview</h2>
              <p className="pm-body-sm leading-relaxed">{service.longDesc}</p>
            </div>
            <div className="flex flex-col gap-8">
              <div>
                <div className="pm-eyebrow !text-dimmer mb-4 md:mb-6">
                  <Users className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  Who this is for
                </div>
                <ul className="flex flex-col gap-3 md:gap-4">
                  {service.whoFor.map((w) => (
                    <li key={w} className="flex items-start gap-3 pm-body-sm">
                      <Check className="mt-1 w-4 h-4 text-yellow flex-shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="pm-eyebrow !text-dimmer mb-4 md:mb-6">
                  <Layers className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  What&apos;s included
                </div>
                <ul className="flex flex-col gap-3 md:gap-4">
                  {service.deliverables.map((d) => (
                    <li key={d} className="flex items-start gap-3 pm-body-sm">
                      <Check className="mt-1 w-4 h-4 text-yellow flex-shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 mt-2 font-display text-[13px] font-semibold text-yellow pm-link-underline"
              >
                Enquire about {service.name} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ INVENTORY MAP (outdoor-media only) ═══ */}
      {service.slug === "outdoor-media" && (
        <section className="bg-transparent" style={{ color: "var(--pm-white)" }}>
          <div className="site-container section">
            <div className="pm-eyebrow mb-4">Site Locations</div>
            <h2 className="pm-section-title mb-6">
              Browse our <span className="pm-accent">inventory</span>
            </h2>
            <p className="pm-hero-sub max-w-[560px] mb-8">
              Explore our media sites across Kenya. Yellow pins are available, grey are booked.
            </p>
            <InventoryMapWrapper />
          </div>
        </section>
      )}

      {/* ═══ PROCESS ════════════════════════════════ */}
      <section className="bg-transparent" style={{ color: "var(--pm-white)" }}>
        <div className="site-container section">
          <div className="pm-eyebrow mb-3 md:mb-4">Our Process</div>
          <h2 className="pm-section-title mb-8 md:mb-12">
            How we deliver <span className="pm-accent">{service.name}</span>
          </h2>
          <div className="flex flex-col gap-6 md:gap-8">
            {service.processSteps.map((step, i) => (
              <div key={step} className="flex gap-4 md:gap-6 pm-body-sm">
                <div className="flex items-center justify-center w-10 h-10 bg-yellow text-black rounded-full font-display font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 pt-1">{step}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ GET STARTED ════════════════════════════ */}
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
              Ready to start your project?
            </h2>
            <p className="pm-hero-sub mb-8 md:mb-10">
              Tell us your goal and we&apos;ll recommend the right approach.
            </p>
            <LeadForm source={`service-${service.slug}`} />
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
