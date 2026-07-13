import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock, Calendar } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/layout";
import { LeadForm } from "@/components/lead-form";
import { ARTICLES } from "@/lib/articles-data";

export const metadata: Metadata = {
  title: "Insights — Market Link | Market Research & Brand Strategy Blog",
  description:
    "Expert analysis on market research, brand strategy, outdoor media, and consumer behaviour in Kenya and East Africa. Practical insights for manufacturers, suppliers, and brands.",
  openGraph: {
    title: "Insights — Market Link",
    description:
      "Expert analysis on market research, brand strategy, outdoor media, and consumer behaviour in East Africa.",
  },
};

export default function InsightsPage() {
  const sorted = [...ARTICLES].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <>
      <SiteHeader />

      <section className="bg-transparent" style={{ color: "var(--pm-white)" }}>
        <div className="site-container pt-28 md:pt-36 pb-12 md:pb-16">
          <div className="pm-eyebrow mb-3 md:mb-4">Insights</div>
          <h1 className="pm-hero-title mb-6 md:mb-8">
            Thinking on the{" "}
            <span className="pm-accent">market</span>
          </h1>
          <p className="pm-hero-sub max-w-[560px]">
            Research, analysis, and opinion on market intelligence, brand
            strategy,             and media in East Africa. Written by the Market Link team.
          </p>
        </div>
      </section>

      <section className="bg-transparent" style={{ color: "var(--pm-white)" }}>
        <div className="site-container section">
          <div className="flex flex-wrap gap-2 mb-10">
            {[...new Set(sorted.map((a) => a.category))].map((cat) => (
              <span
                key={cat}
                className="px-3 py-1.5 text-[12px] font-mono font-semibold tracking-wider uppercase rounded-full"
                style={{
                  background: "rgba(244, 195, 0, 0.12)",
                  color: "var(--pm-yellow)",
                  border: "1px solid rgba(244, 195, 0, 0.2)",
                }}
              >
                {cat}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {sorted.map((post, i) => (
              <Link
                key={post.slug}
                href={`/insights/${post.slug}`}
                className="group block"
                style={{
                  opacity: 0,
                  animation: `fade-slide-up 500ms ease-out ${i * 80}ms forwards`,
                }}
              >
                <article
                  className="pm-dash-card overflow-hidden h-full flex flex-col"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <div
                    className="relative overflow-hidden"
                    style={{ height: "200px" }}
                  >
                    <Image
                      src={post.imageUrl}
                      alt={post.imageAlt}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      style={{ objectFit: "cover" }}
                      className="transition-transform duration-500 group-hover:scale-105"
                    />
                    <span
                      className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-mono font-semibold tracking-wider uppercase rounded-full z-10"
                      style={{
                        background: "rgba(244, 195, 0, 0.9)",
                        color: "#0A0A0A",
                      }}
                    >
                      {post.category}
                    </span>
                  </div>

                  <div className="p-6 md:p-8 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-3 text-[11px] text-gray-5 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                      </span>
                    </div>

                    <h3
                      className="font-display font-bold mb-3 leading-snug transition-colors duration-200"
                      style={{
                        fontSize: "clamp(17px, 1.5vw, 19px)",
                        color: "var(--pm-white)",
                      }}
                    >
                      {post.title}
                    </h3>

                    <p
                      className="text-[14px] leading-relaxed mb-4 flex-1"
                      style={{ color: "var(--pm-gray-4)" }}
                    >
                      {post.excerpt}
                    </p>

                    <div
                      className="flex items-center gap-1.5 text-xs font-display font-medium transition-colors duration-150"
                      style={{
                        color: "var(--pm-gray-5)",
                      }}
                    >
                      <span className="group-hover:text-yellow transition-colors">
                        Read article
                      </span>
                      <ArrowRight
                        size={12}
                        className="group-hover:translate-x-1 transition-transform"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section
        className="bg-transparent"
        style={{ color: "var(--pm-black)", background: "var(--pm-white)" }}
      >
        <div className="site-container section">
          <div
            className="max-w-[500px] mx-auto text-center"
            style={{ color: "var(--pm-black)" }}
          >
            <div
              className="pm-eyebrow mb-3 md:mb-4"
              style={{ color: "var(--pm-amber)" }}
            >
              Stay Informed
            </div>
            <h2 className="pm-section-title mb-4 md:mb-6">
              Subscribe to insights
            </h2>
            <p
              className="pm-hero-sub mb-8 md:mb-10"
              style={{ color: "var(--pm-gray-3)" }}
            >
              Get our latest research and analysis delivered to your inbox.
            </p>
            <LeadForm source="insights-page" />
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
