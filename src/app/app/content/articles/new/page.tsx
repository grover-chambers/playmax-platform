"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";

const categories = [
  "Marketing",
  "Brand Strategy",
  "Market Research",
  "Outdoor Media",
  "Digital",
  "Case Study",
  "Industry News",
];

export default function NewArticlePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function generateSlug(val: string) {
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !category) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSubmitting(false);
    router.push("/app/content/articles");
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--ws-bg)" }}>
      <PageHeader
        title="New Article"
        subtitle="Create a new blog post or insight"
        actions={
          <Button variant="secondary" size="sm" onClick={() => router.back()}>
            <ArrowLeft size={14} className="mr-1" /> Back
          </Button>
        }
      />

      <div className="flex-1" style={{ padding: "0 22px 22px", maxWidth: 720 }}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              Title
            </label>
            <input
              className="w-full ws-input rounded-lg placeholder-gray-5"
              placeholder="e.g. How Outdoor Media is Evolving in 2026"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")) {
                  generateSlug(e.target.value);
                }
              }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              Slug
            </label>
            <input
              className="w-full ws-input rounded-lg placeholder-gray-5 font-mono"
              placeholder="how-outdoor-media-is-evolving"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <p className="text-[10px] text-gray-5 mt-1">URL path for the article</p>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <div className="flex gap-2 flex-wrap">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-colors ${
                    category === c
                      ? "bg-[var(--ws-accent)]/10 text-[var(--ws-accent)] border-[var(--ws-accent)]/20"
                      : "bg-[var(--ws-surface)] text-gray-4 border-[var(--ws-border)] hover:border-gray-4"
                  }`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              Excerpt
            </label>
            <textarea
              className="w-full ws-input rounded-lg placeholder-gray-5 resize-none"
              rows={3}
              placeholder="Brief summary for preview cards"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              Body
            </label>
            <textarea
              className="w-full ws-input rounded-lg placeholder-gray-5 resize-none"
              rows={12}
              placeholder="Write your article content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="primary" type="submit" disabled={submitting}>
              <Save size={14} className="mr-1.5" />
              {submitting ? "Publishing..." : "Publish Article"}
            </Button>
            <Button variant="secondary" type="button" onClick={() => router.back()}>
              Save Draft
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
