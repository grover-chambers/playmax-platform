import { SiteHeader, SiteFooter } from "@/components/layout";
import { LeadForm } from "@/components/lead-form";

export default function ContactPage() {
  return (
    <>
      <SiteHeader />

      <section className="bg-black">
        <div className="site-container pt-28 md:pt-36 pb-24 md:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_500px] gap-12 md:gap-24">
            <div className="flex flex-col justify-center">
              <div className="eyebrow mb-3 md:mb-4">Contact Us</div>
              <h1 className="text-hero mb-6 md:mb-8">
                Ready to find
                <br />
                <span className="accent">your market?</span>
              </h1>
              <p className="body-copy-sm mb-8 md:mb-10 max-w-[520px]">
                Tell us what you&apos;re trying to achieve. We&apos;ll respond
                within one business day with a project brief and a quote.
              </p>

              <div className="flex flex-col gap-5 md:gap-6">
                <div className="flex items-start gap-4">
                  <span className="eyebrow !text-[10px] md:!text-[11px] w-24 flex-shrink-0">
                    Phone
                  </span>
                  <span className="text-[15px] md:text-[16px] text-white font-medium">
                    +254 700 000 000
                  </span>
                </div>
                <div className="flex items-start gap-4">
                  <span className="eyebrow !text-[10px] md:!text-[11px] w-24 flex-shrink-0">
                    Email
                  </span>
                  <span className="text-[15px] md:text-[16px] text-white font-medium">
                    hello@playmaxagency.co.ke
                  </span>
                </div>
                <div className="flex items-start gap-4">
                  <span className="eyebrow !text-[10px] md:!text-[11px] w-24 flex-shrink-0">
                    Location
                  </span>
                  <span className="text-[15px] md:text-[16px] text-gray-3">
                    Westlands Business Park, Nairobi
                  </span>
                </div>
                <div className="flex items-start gap-4">
                  <span className="eyebrow !text-[10px] md:!text-[11px] w-24 flex-shrink-0">
                    Hours
                  </span>
                  <span className="text-[15px] md:text-[16px] text-gray-3">
                    Mon — Fri: 8:00 AM — 6:00 PM EAT
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:pt-0">
              <LeadForm source="contact-page" />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
