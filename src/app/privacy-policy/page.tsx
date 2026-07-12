import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "@/components/layout";

export const metadata: Metadata = {
  title: "Privacy Policy — PlayMax Agency",
  description: "How PlayMax collects, uses, and protects your personal data in compliance with the Kenya Data Protection Act 2019 and the EU GDPR.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-container" style={{ paddingTop: "120px", paddingBottom: "80px" }}>
        <article style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: July 2026</p>

          <section className="prose-custom space-y-6 text-[15px] leading-relaxed">
            <p>
              PlayMax Agency (&ldquo;PlayMax&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;)
              is committed to protecting your privacy. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your personal data when you visit our website, use our services,
              or interact with us. It is aligned with the <strong>Kenya Data Protection Act, No. 24 of 2019</strong>{/* */}
              (the &ldquo;DPA&rdquo;) and, where applicable, the <strong>EU General Data Protection Regulation</strong>{/* */}
              (the &ldquo;GDPR&rdquo;).
            </p>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">1. Who We Are</h2>
            <p>
              PlayMax Agency is a market intelligence, brand strategy, and media activation firm operating
              in Nairobi, Kenya. We provide research, strategy, outdoor media, event activations, data
              analytics, and campaign management services to manufacturers, suppliers, and market entrants
              across East Africa.
            </p>
            <p>
              <strong>Registered office:</strong> Westlands Business Park, Off Waiyaki Way, Nairobi, Kenya.
              <br />
              <strong>Email:</strong> hello@playmaxagency.co.ke
              <br />
              <strong>Phone:</strong> +254 700 000 000
            </p>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">2. Personal Data We Collect</h2>
            <p>We may collect the following categories of personal data:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Identity data:</strong> name, job title, company name.</li>
              <li><strong>Contact data:</strong> email address, phone number, postal address.</li>
              <li><strong>Usage data:</strong> how you interact with our website (pages visited, time spent, referral source).</li>
              <li><strong>Marketing data:</strong> your preferences in receiving marketing from us.</li>
              <li><strong>Project data:</strong> information provided in the course of an engagement (briefs, research inputs, feedback).</li>
            </ul>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">3. How We Collect Your Data</h2>
            <p>We collect data directly from you when you:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Fill out a contact or inquiry form on our website.</li>
              <li>Engage us for services under a statement of work or contract.</li>
              <li>Subscribe to our newsletter or insights mailing list.</li>
              <li>Correspond with us via email, phone, or messaging platforms.</li>
            </ul>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">4. Lawful Basis for Processing</h2>
            <p>Under the DPA and GDPR, we process your personal data on the following lawful bases:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Consent:</strong> where you have explicitly agreed (e.g., newsletter subscription).</li>
              <li><strong>Contractual necessity:</strong> to fulfil our obligations under a service agreement.</li>
              <li><strong>Legitimate interest:</strong> to improve our services, secure our website, and send relevant business communications.</li>
              <li><strong>Legal obligation:</strong> where required by Kenyan law or regulatory authority.</li>
            </ul>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">5. How We Use Your Data</h2>
            <p>We use your personal data to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Respond to inquiries and provide quotes or proposals.</li>
              <li>Deliver contracted services (research, strategy, media activation).</li>
              <li>Send project updates, invoices, and operational communications.</li>
              <li>Share insights, case studies, and industry news (with opt-out available).</li>
              <li>Comply with legal and regulatory obligations.</li>
              <li>Improve our website and service offering through analytics.</li>
            </ul>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">6. Data Sharing and Disclosure</h2>
            <p>We do not sell your personal data. We may share data with:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Service providers:</strong> cloud hosting (Supabase, Vercel), email delivery, survey tools — bound by data processing agreements.</li>
              <li><strong>Professional advisors:</strong> legal, accounting, or consultancy firms bound by confidentiality.</li>
              <li><strong>Regulatory authorities:</strong> when required by the Office of the Data Protection Commissioner (Kenya) or other lawful authority.</li>
            </ul>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">7. Data Retention</h2>
            <p>
              We retain your personal data only as long as necessary to fulfil the purposes for which it was
              collected, including satisfying legal, accounting, or reporting requirements. Typically:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Inquiry data: 2 years after last contact.</li>
              <li>Client project data: 7 years after project completion (for legal and tax purposes).</li>
              <li>Newsletter subscriptions: until you unsubscribe.</li>
            </ul>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">8. Your Rights</h2>
            <p>Under the Kenya DPA and GDPR, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Access:</strong> request a copy of the personal data we hold about you.</li>
              <li><strong>Rectification:</strong> ask us to correct inaccurate or incomplete data.</li>
              <li><strong>Erasure:</strong> request deletion of your data, subject to legal retention requirements.</li>
              <li><strong>Restriction:</strong> limit how we process your data.</li>
              <li><strong>Portability:</strong> receive your data in a structured, machine-readable format.</li>
              <li><strong>Objection:</strong> object to processing based on legitimate interest or direct marketing.</li>
              <li><strong>Withdraw consent:</strong> at any time, without affecting the lawfulness of prior processing.</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at <strong>hello@playmaxagency.co.ke</strong>.
              We will respond within 30 days as required by the DPA. If you are unsatisfied, you may lodge
              a complaint with the <strong>Office of the Data Protection Commissioner (ODPC)</strong> at
              www.odpc.go.ke.
            </p>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">9. International Data Transfers</h2>
            <p>
              Where we transfer your data outside Kenya (e.g., cloud infrastructure providers), we ensure
              appropriate safeguards are in place, including standard contractual clauses or equivalent
              mechanisms recognised under the DPA and GDPR.
            </p>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">10. Security</h2>
            <p>
              We implement appropriate technical and organisational measures to protect your personal data
              against unauthorised access, alteration, disclosure, or destruction. These include encryption
              in transit (TLS), access controls, regular security reviews, and staff training on data protection.
            </p>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">11. Cookies</h2>
            <p>
              Our website uses cookies and similar tracking technologies. For full details, please see our
              <a href="/cookie-policy" style={{ textDecoration: "underline", marginLeft: "4px" }}>Cookie Policy</a>.
            </p>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page with
              an updated revision date. We encourage you to review this policy periodically.
            </p>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">13. Contact Us</h2>
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy or our data
              practices, please contact our Data Protection Officer:
            </p>
            <p>
              <strong>Email:</strong> hello@playmaxagency.co.ke
              <br />
              <strong>Phone:</strong> +254 700 000 000
              <br />
              <strong>Address:</strong> Westlands Business Park, Off Waiyaki Way, Nairobi, Kenya
            </p>
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
