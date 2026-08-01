"use client";

import React, { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  category: string;
  published_at: string | null;
}

export default function PortalContentArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/portal/content?slug=${slug}`)
      .then((r) => r.json())
      .then(({ article: data }) => {
        startTransition(() => {
          setArticle(data || null);
          setLoading(false);
        });
      })
      .catch(() => startTransition(() => setLoading(false)));
  }, [slug]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-teal" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="page-content">
        <Link href="/portal/content" className="flex items-center gap-1.5 text-[12px] text-teal hover:underline mb-6">
          <ArrowLeft size={12} /> Back to content library
        </Link>
        <div className="pm-dash-card p-6 text-center">
          <div className="text-[12px] text-gray-4">Article not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content max-w-3xl mx-auto">
      <Link href="/portal/content" className="flex items-center gap-1.5 text-[12px] text-teal hover:underline mb-6">
        <ArrowLeft size={12} /> Back to content library
      </Link>

      <div className="pm-dash-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-yellow/10 text-yellow border border-yellow/20">
            {article.category.replace(/_/g, " ")}
          </span>
          {article.published_at && (
            <span className="flex items-center gap-1 text-[10px] text-gray-5 font-mono">
              <Calendar size={10} />
              {new Date(article.published_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          )}
        </div>

        <h1 className="font-display text-[22px] font-bold text-[var(--ws-text)] leading-tight mb-3">{article.title}</h1>

        {article.excerpt && (
          <p className="text-[14px] text-gray-4 leading-relaxed mb-6">{article.excerpt}</p>
        )}

        {article.content && (
          <div className="text-[13px] text-gray-3 leading-relaxed space-y-4 whitespace-pre-wrap">
            {article.content}
          </div>
        )}
      </div>
    </div>
  );
}
