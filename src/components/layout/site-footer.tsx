import React from "react";
import Link from "next/link";

function SiteFooter() {
  return (
    <footer className="site-footer !flex-col !items-start md:!flex-row md:!items-center gap-8 md:gap-0">
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 mb-12 md:mb-16">
          <div>
            <div className="site-logo mb-5">
              PLAY<span className="site-logo-accent">MAX</span>
            </div>
            <p className="body-copy-sm max-w-[280px]">
              Market intelligence, brand strategy, and media activation for
              manufacturers, suppliers, and market entrants across East Africa.
            </p>
          </div>

          <div>
            <div className="eyebrow !text-[10px] mb-6">Services</div>
            <div className="flex flex-col gap-3.5">
              {[
                "Market Research",
                "Brand Strategy",
                "Outdoor Media",
                "Event Activations",
                "Data & Analytics",
              ].map((s) => (
                <Link
                  key={s}
                  href="/services"
                  className="text-[14px] text-gray-4 no-underline hover:text-white transition-colors duration-200"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="eyebrow !text-[10px] mb-6">Contact</div>
            <div className="flex flex-col gap-3.5 text-[14px] text-gray-4">
              <div>Westlands Business Park</div>
              <div>Off Waiyaki Way, Nairobi</div>
              <div className="text-white">+254 700 000 000</div>
              <div className="text-white">hello@playmaxagency.co.ke</div>
            </div>
          </div>
        </div>

        <div className="divider my-8" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="footer-copy">
            © 2026 PlayMax Agency. All rights reserved.
          </div>
          <div className="footer-copy">
            Built by{" "}
            <span className="text-yellow font-display font-semibold">
              Squareroot INC.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
