"use client";

import React, { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { FileText, Calendar, ArrowRight, Loader2 } from "lucide-react";
import PageHeader from "@/components/layout/page-header";

interface CmsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string;
  published_at: string | null;
}

function formatDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PortalContentPage() {
  const [articles, setArticles] = useState<CmsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/content")
      .then((r) => r.json())
      .then(({ articles: data }) => {
        startTransition(() => {
          setArticles(data || []);
          setLoading(false);
        });
      })
      .catch(() => startTransition(() => setLoading(false)));
  }, []);

  if (loading) {
    return (
      <div className="page-content">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-teal" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Content Library"
        subtitle={`${articles.length} article${articles.length !== 1 ? "s" : ""} available`}
      />

      {articles.length === 0 ? (
        <div className="pm-dash-card p-6 text-center">
          <FileText size={24} className="text-gray-5 mx-auto mb-2" />
          <div className="text-[12px] text-gray-4">No content available yet</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {articles.map((a) => (
            <Link
              key={a.id}
              href={`/portal/content/${a.slug}`}
              className="pm-dash-card pm-dash-card-b flex items-start justify-between gap-4 hover:border-teal/20 transition-colors"
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-yellow/10 border border-yellow/20 flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="text-yellow" />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-[14px] font-semibold text-[var(--ws-text)] leading-tight">
                    {a.title}
                  </div>
                  {a.excerpt && (
                    <div className="text-[12px] text-gray-4 mt-1 line-clamp-2">{a.excerpt}</div>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[9px] font-mono text-gray-5 uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--ws-bg)] border border-[var(--ws-border)]">
                      {a.category.replace(/_/g, " ")}
                    </span>
                    {a.published_at && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-5 font-mono">
                        <Calendar size={10} />
                        {formatDate(a.published_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ArrowRight size={14} className="text-gray-5 flex-shrink-0 mt-2" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
