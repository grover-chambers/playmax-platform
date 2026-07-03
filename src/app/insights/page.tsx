import { ArrowUpRight, Clock } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/layout";

const posts = [
  {
    title: "Why Nairobi's billboard market is shifting to digital",
    category: "Industry Trends",
    date: "2026-06-18",
    readTime: "5 min read",
    excerpt:
      "The transition from static to digital OOH is accelerating — here's what it means for advertisers and media owners in Kenya.",
  },
  {
    title: "How to pick the right market research method for your product",
    category: "Research Methods",
    date: "2026-06-10",
    readTime: "8 min read",
    excerpt:
      "Not all research is created equal. We break down when to use surveys, focus groups, ethnographic studies, and data analysis.",
  },
  {
    title: "5 brand activation mistakes we see in East Africa",
    category: "Brand Strategy",
    date: "2026-05-28",
    readTime: "6 min read",
    excerpt:
      "From ignoring local context to skipping measurement — these common missteps can tank even the best-funded campaigns.",
  },
  {
    title: "The ROI of competitor research before market entry",
    category: "Research Methods",
    date: "2026-05-15",
    readTime: "7 min read",
    excerpt:
      "A case for why investing in competitor intelligence before launch often pays for itself within the first quarter.",
  },
  {
    title: "OOH vs. digital: When physical media still wins",
    category: "Industry Trends",
    date: "2026-04-30",
    readTime: "4 min read",
    excerpt:
      "Digital isn't always better. In certain Kenyan markets, outdoor media still delivers unmatched reach and recall.",
  },
  {
    title: "How PlayMax measures event activation success",
    category: "Case Study",
    date: "2026-04-12",
    readTime: "6 min read",
    excerpt:
      "Our framework for tracking footfall, engagement, and conversion at every activation we run — and why it matters.",
  },
];

export default function InsightsPage() {
  return (
    <>
      <SiteHeader />

      <section className="bg-black">
        <div className="site-container pt-28 md:pt-36 pb-12 md:pb-16">
          <div className="eyebrow mb-3 md:mb-4">Insights</div>
          <h1 className="text-hero mb-6 md:mb-8">
            Thinking on the <span className="accent">market</span>
          </h1>
          <p className="body-copy max-w-[560px]">
            Research, analysis, and opinion on market intelligence, brand
            strategy, and media in East Africa.
          </p>
        </div>
      </section>

      <section className="bg-black-2">
        <div className="site-container section">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {posts.map((post) => (
              <div
                key={post.title}
                className="card !bg-black-3 !border-black-4 overflow-hidden card-hover-yellow group"
              >
                <div className="h-[160px] bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] flex items-center justify-center relative">
                  <ArrowUpRight className="w-8 h-8 text-gray-5 group-hover:text-yellow transition-colors" />
                </div>
                <div className="p-6 md:p-8">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="eyebrow">{post.category}</span>
                    <span className="flex items-center gap-1 text-[10px] text-gray-5">
                      <Clock className="w-3 h-3" /> {post.readTime}
                    </span>
                  </div>
                  <h3 className="font-display text-[16px] md:text-[18px] font-semibold mb-3 leading-snug group-hover:text-yellow transition-colors">
                    {post.title}
                  </h3>
                  <p className="body-copy-sm mb-4">{post.excerpt}</p>
                  <div className="text-[12px] text-gray-5 font-mono">
                    {new Date(post.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 md:mt-20">
            <div className="card !bg-black-3 max-w-[540px] mx-auto text-center p-10">
              <div className="text-[16px] md:text-[18px] font-semibold mb-2">
                Subscribe to insights
              </div>
              <p className="body-copy-sm mb-6">
                Get our latest research and analysis delivered to your inbox.
              </p>
              <a
                href="/contact"
                className="btn-primary !text-[13px] !px-6 !py-2.5 no-underline"
              >
                Get Notified
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
