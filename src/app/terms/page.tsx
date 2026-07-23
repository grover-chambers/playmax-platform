import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "@/components/layout";

export const metadata: Metadata = {
  title: "Terms of Service — Market Link",
  description: "Terms and conditions governing the use of Market Link's website and services.",
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-container" style={{ paddingTop: "120px", paddingBottom: "80px" }}>
        <article style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: July 2026</p>

          <section className="prose-custom space-y-6 text-[15px] leading-relaxed">
            <h2 className="text-xl font-display font-bold mt-10 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Market Link website and services, you agree to be bound by
              these Terms of Service. If you do not agree, please do not use our website or services.
            </p>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">2. Services</h2>
            <p>
              Market Link provides market research, brand strategy, outdoor media, event activations,
              data analytics, and campaign management services. Specific terms for each engagement are
              defined in a separate Statement of Work (SOW) or contract signed by both parties.
            </p>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">3. Intellectual Property</h2>
            <p>
              All content on this website — including text, graphics, logos, case studies, and research
              reports — is the property of Market Link unless otherwise stated. You may not reproduce,
              distribute, or modify any content without our written permission. Deliverables produced
              under a paid engagement are governed by the intellectual property terms in the applicable SOW.
            </p>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">4. Use of the Website</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the website for any unlawful purpose.</li>
              <li>Attempt to gain unauthorised access to our systems.</li>
              <li>Submit false or misleading information through forms.</li>
              <li>Interfere with the proper functioning of the website.</li>
            </ul>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">5. Limitation of Liability</h2>
            <p>
              Market Link shall not be liable for any indirect, incidental, or consequential damages
              arising from your use of this website or our services, to the maximum extent permitted by
              Kenyan law.
            </p>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">6. Governing Law</h2>
            <p>
              These terms are governed by the laws of the Republic of Kenya. Any disputes shall be
              subject to the exclusive jurisdiction of the courts of Kenya.
            </p>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">7. Contact</h2>
            <p>
              For questions about these terms, contact us at <strong>playmaxltd@gmail.com</strong>.
            </p>
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
