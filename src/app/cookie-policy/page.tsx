import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "@/components/layout";

export const metadata: Metadata = {
  title: "Cookie Policy — PlayMax Agency",
  description: "How PlayMax Agency uses cookies and similar technologies, in compliance with the Kenya Data Protection Act 2019 and the EU ePrivacy Directive.",
};

export default function CookiePolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-container" style={{ paddingTop: "120px", paddingBottom: "80px" }}>
        <article style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Cookie Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: July 2026</p>

          <section className="prose-custom space-y-6 text-[15px] leading-relaxed">
            <p>
              This Cookie Policy explains how PlayMax Agency (&ldquo;PlayMax&rdquo;, &ldquo;we&rdquo;,
              &ldquo;us&rdquo;, or &ldquo;our&rdquo;) uses cookies and similar tracking technologies on our
              website. It is designed to comply with the <strong>Kenya Data Protection Act, No. 24 of 2019</strong>{/* */}
              and the <strong>EU ePrivacy Directive</strong> (via GDPR).
            </p>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">1. What Are Cookies</h2>
            <p>
              Cookies are small text files placed on your device (computer, tablet, or mobile) when you
              visit a website. They are widely used to make websites work efficiently, enhance user
              experience, and provide information to site owners.
            </p>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">2. Types of Cookies We Use</h2>

            <h3 className="font-bold mt-6 mb-2">Essential / Strictly Necessary Cookies</h3>
            <p>
              These cookies are necessary for the website to function and cannot be switched off. They
              enable core functionality such as security, session management, and authentication (login).
              You may disable these by changing your browser settings, but this may affect how the site
              performs. These cookies do not store any personally identifiable information.
            </p>

            <h3 className="font-bold mt-6 mb-2">Performance & Analytics Cookies</h3>
            <p>
              These cookies allow us to count visits and traffic sources so we can measure and improve
              the performance of our site. They help us understand which pages are most and least popular
              and see how visitors move around the site. All information these cookies collect is
              aggregated and therefore anonymous.
            </p>

            <h3 className="font-bold mt-6 mb-2">Functionality Cookies</h3>
            <p>
              These cookies enable the website to provide enhanced functionality and personalisation,
              such as remembering your preferences (e.g., language or region). They may be set by us or
              by third-party providers whose services we have added to our pages.
            </p>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">3. Specific Cookies We Use</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 pr-4 font-bold">Cookie Name</th>
                    <th className="text-left py-2 pr-4 font-bold">Purpose</th>
                    <th className="text-left py-2 pr-4 font-bold">Duration</th>
                    <th className="text-left py-2 font-bold">Type</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 pr-4 font-mono text-xs">sb-*-auth-token</td>
                    <td className="py-2 pr-4">Authentication session (Supabase)</td>
                    <td className="py-2 pr-4">Session</td>
                    <td className="py-2">Essential</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 pr-4 font-mono text-xs">_ga / _ga_*</td>
                    <td className="py-2 pr-4">Google Analytics — anonymous usage tracking</td>
                    <td className="py-2 pr-4">2 years</td>
                    <td className="py-2">Analytics</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-2 pr-4 font-mono text-xs">_gid</td>
                    <td className="py-2 pr-4">Google Analytics — user distinction</td>
                    <td className="py-2 pr-4">24 hours</td>
                    <td className="py-2">Analytics</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">cookie_consent</td>
                    <td className="py-2 pr-4">Records your cookie preference</td>
                    <td className="py-2 pr-4">12 months</td>
                    <td className="py-2">Essential</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">4. Third-Party Cookies</h2>
            <p>
              Some cookies are placed by third-party services that appear on our pages. These include:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Google Analytics</strong> — for anonymous website usage analysis.</li>
              <li><strong>Supabase</strong> — for authentication and session management.</li>
              <li><strong>Vercel</strong> — for hosting and performance analytics.</li>
            </ul>
            <p>
              These third parties have their own privacy and cookie policies. We encourage you to review them.
            </p>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">5. Your Consent</h2>
            <p>
              Under Kenyan law (Data Protection Act, 2019) and the EU ePrivacy Directive, we are required
              to obtain your consent before placing non-essential cookies on your device. When you first
              visit our website, you will see a cookie banner that allows you to:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Accept all cookies.</li>
              <li>Reject non-essential cookies.</li>
              <li>Customise your preferences.</li>
            </ul>
            <p>
              Essential cookies are set automatically because they are necessary for the website to function.
              You can withdraw or change your consent at any time by clearing cookies in your browser settings.
            </p>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">6. How to Manage Cookies</h2>
            <p>
              Most web browsers allow you to manage your cookie preferences. You can:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Block or delete cookies through your browser settings.</li>
              <li>Set your browser to notify you before a cookie is set.</li>
              <li>Use private or incognito browsing mode.</li>
            </ul>
            <p className="mt-4">
              For detailed instructions, visit the help page of your browser:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/en-ke/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>Microsoft Edge</a></li>
            </ul>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">7. Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time. Changes will be posted on this page
              with an updated revision date. Continued use of our website after changes constitutes
              acceptance of the updated policy.
            </p>

            <h2 className="text-xl font-display font-bold mt-10 mb-3">8. Contact Us</h2>
            <p>
              If you have questions about our use of cookies, please contact us:
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
