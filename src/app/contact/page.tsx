import { SiteHeader, SiteFooter } from "@/components/layout";
import { LeadForm } from "@/components/lead-form";

export default function ContactPage() {
  return (
    <>
      <SiteHeader />

      <section className="bg-transparent" style={{ color: "var(--pm-black)" }}>
        <div className="site-container pt-28 md:pt-36 pb-24 md:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_500px] gap-12 md:gap-24">
            <div className="flex flex-col justify-center">
              <div
                className="pm-eyebrow mb-3 md:mb-4"
                style={{ color: "var(--pm-amber)" }}
              >
                Contact Us
              </div>
              <h1 className="pm-hero-title mb-6 md:mb-8">
                Ready to find
                <br />
                <span className="pm-accent">your market?</span>
              </h1>
              <p className="pm-hero-sub mb-8 md:mb-10 max-w-130">
                Tell us what you&apos;re trying to achieve. We&apos;ll respond
                within one business day with a project brief and a quote.
              </p>

              <div className="flex flex-col gap-5 md:gap-6">
                <div className="flex items-start gap-4">
                  <span
                    className="pm-eyebrow text-[11px]! md:text-[12px]! w-24 flex-shrink-0"
                    style={{ color: "var(--pm-amber)" }}
                  >
                    Phone
                  </span>
                  <span
                    className="text-[16px] md:text-[17px] font-medium"
                    style={{ color: "var(--pm-black)" }}
                  >
                    +254 741 953 190
                  </span>
                </div>
                <div className="flex items-start gap-4">
                  <span
                    className="pm-eyebrow text-[11px]! md:text-[12px]! w-24 flex-shrink-0"
                    style={{ color: "var(--pm-amber)" }}
                  >
                    Email
                  </span>
                  <span
                    className="text-[16px] md:text-[17px] font-medium"
                    style={{ color: "var(--pm-black)" }}
                  >
                    playmaxltd@gmail.com
                  </span>
                </div>
                <div className="flex items-start gap-4">
                  <span
                    className="pm-eyebrow text-[11px]! md:text-[12px]! w-24 flex-shrink-0"
                    style={{ color: "var(--pm-amber)" }}
                  >
                    Location
                  </span>
                  <span className="text-[16px] md:text-[17px] text-gray-3">
                    Westlands Business Park, Nairobi
                  </span>
                </div>
                <div className="flex items-start gap-4">
                  <span
                    className="pm-eyebrow text-[11px]! md:text-[12px]! w-24 flex-shrink-0"
                    style={{ color: "var(--pm-amber)" }}
                  >
                    Hours
                  </span>
                  <span className="text-[16px] md:text-[17px] text-gray-3">
                    Mon — Fri: 8:00 AM — 6:00 PM EAT
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:pt-0">
              <div className="bg-white/80 p-8 md:p-10 rounded-lg border border-white/20 backdrop-blur-sm">
                <LeadForm source="contact-page" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
