import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Clock, Calendar, Tag, ChevronLeft } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/layout";
import { LeadForm } from "@/components/lead-form";
import {
  ARTICLES,
  getArticleBySlug,
  getLatestArticles,
} from "@/lib/articles-data";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return { title: "Article Not Found — Market Link" };
  return {
    title: `${article.title} — Market Link Insights`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.date,
      images: [{ url: article.imageUrl, alt: article.imageAlt }],
    },
    keywords: article.tags.join(", "),
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return notFound();
  }

  const related = getLatestArticles(3).filter((a) => a.slug !== slug);
  const paragraphs = article.content
    .split("\n")
    .filter((line) => line.trim().length > 0);

  return (
    <>
      <SiteHeader />

      <article style={{ color: "var(--pm-white)" }}>
        {/* ═══ HERO ═══════════════════════════════════ */}
        <section className="bg-transparent">
          <div className="site-container pt-28 md:pt-36 pb-8 md:pb-12">
            <Link
              href="/insights"
              className="inline-flex items-center gap-1.5 text-[13px] font-mono font-semibold tracking-wider uppercase mb-8 transition-colors duration-150"
              style={{ color: "var(--pm-gray-5)" }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back to insights
            </Link>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span
                className="px-2.5 py-1 text-[10px] font-mono font-semibold tracking-wider uppercase rounded-full"
                style={{
                  background: "rgba(244, 195, 0, 0.12)",
                  color: "var(--pm-yellow)",
                  border: "1px solid rgba(244, 195, 0, 0.2)",
                }}
              >
                {article.category}
              </span>
              <span
                className="flex items-center gap-1 text-[12px] font-mono"
                style={{ color: "var(--pm-gray-5)" }}
              >
                <Calendar className="w-3 h-3" />
                {new Date(article.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span
                className="flex items-center gap-1 text-[12px] font-mono"
                style={{ color: "var(--pm-gray-5)" }}
              >
                <Clock className="w-3 h-3" />
                {article.readTime}
              </span>
            </div>

            <h1
              className="pm-hero-title mb-4"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)" }}
            >
              {article.title}
            </h1>

            <p className="pm-hero-sub max-w-[560px]">{article.excerpt}</p>
          </div>
        </section>

        {/* ═══ FEATURED IMAGE ════════════════════════ */}
        <section className="bg-transparent">
          <div className="site-container pb-12 md:pb-16">
            <div
              className="relative overflow-hidden rounded-xl"
              style={{
                width: "100%",
                height: "clamp(250px, 40vw, 450px)",
              }}
            >
              <Image
                src={article.imageUrl}
                alt={article.imageAlt}
                fill
                sizes="100vw"
                style={{ objectFit: "cover" }}
                priority
              />
            </div>
          </div>
        </section>

        {/* ═══ ARTICLE BODY ══════════════════════════ */}
        <section className="bg-transparent">
          <div className="site-container pb-12 md:pb-20">
            <div
              className="max-w-[720px] mx-auto"
              style={{ color: "var(--pm-white)" }}
            >
              {paragraphs.map((line, i) => {
                if (line.startsWith("**") && line.endsWith("**")) {
                  return (
                    <h2
                      key={i}
                      className="font-display font-bold mt-10 mb-4"
                      style={{
                        fontSize: "clamp(1.3rem, 2.2vw, 1.6rem)",
                        color: "var(--pm-yellow)",
                      }}
                    >
                      {line.replace(/\*\*/g, "")}
                    </h2>
                  );
                }

                if (
                  line.startsWith("**") &&
                  line.includes("**") &&
                  !line.endsWith("**")
                ) {
                  const subhead = line.match(/\*\*(.+?)\*\*/);
                  if (subhead) {
                    return (
                      <h2
                        key={i}
                        className="font-display font-bold mt-10 mb-4"
                        style={{
                          fontSize: "clamp(1.3rem, 2.2vw, 1.6rem)",
                          color: "var(--pm-yellow)",
                        }}
                      >
                        {subhead[1]}
                      </h2>
                    );
                  }
                }

                return (
                  <p
                    key={i}
                    className="mb-5 leading-relaxed"
                    style={{
                      fontSize: "clamp(16px, 1.2vw, 18px)",
                      color: "var(--pm-gray-2)",
                      lineHeight: 1.8,
                    }}
                  >
                    {line}
                  </p>
                );
              })}

              {/* Tags */}
              <div
                className="flex flex-wrap gap-2 mt-12 pt-8"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                <Tag
                  className="w-4 h-4 mt-1"
                  style={{ color: "var(--pm-gray-5)" }}
                />
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-[11px] font-mono tracking-wider uppercase rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "var(--pm-gray-4)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ RELATED ARTICLES ══════════════════════ */}
        {related.length > 0 && (
          <section
            className="bg-transparent"
            style={{
              color: "var(--pm-white)",
              borderTop: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <div className="site-container section">
              <div className="pm-eyebrow mb-4">Related Articles</div>
              <h2 className="pm-section-title mb-8">
                More <span className="pm-accent">insights</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {related.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/insights/${post.slug}`}
                    className="group block"
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
                        style={{ height: "160px" }}
                      >
                        <Image
                          src={post.imageUrl}
                          alt={post.imageAlt}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          style={{ objectFit: "cover" }}
                          className="transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <span
                          className="text-[10px] font-mono font-semibold tracking-wider uppercase mb-2"
                          style={{ color: "var(--pm-yellow)" }}
                        >
                          {post.category}
                        </span>
                        <h3
                          className="font-display font-bold text-[15px] leading-snug mb-2"
                          style={{ color: "var(--pm-white)" }}
                        >
                          {post.title}
                        </h3>
                        <p
                          className="text-[13px] flex-1"
                          style={{ color: "var(--pm-gray-4)" }}
                        >
                          {post.excerpt}
                        </p>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══ GET STARTED ════════════════════════════ */}
        <section
          className="bg-transparent"
          style={{ color: "var(--pm-black)", background: "var(--pm-white)" }}
        >
          <div className="site-container section">
            <div className="max-w-[500px] mx-auto text-center">
              <div
                className="pm-eyebrow mb-3 md:mb-4"
                style={{ color: "var(--pm-amber)" }}
              >
                Get Started
              </div>
              <h2 className="pm-section-title mb-4 md:mb-6">
                Ready to find your{" "}
                <span className="pm-accent">market?</span>
              </h2>
              <p
                className="pm-hero-sub mb-8 md:mb-10"
                style={{ color: "var(--pm-gray-3)" }}
              >
                Tell us what you&apos;re trying to achieve. We&apos;ll respond
                within one business day.
              </p>
              <LeadForm source={`article-${article.slug}`} />
            </div>
          </div>
        </section>
      </article>

      <SiteFooter />
    </>
  );
}
