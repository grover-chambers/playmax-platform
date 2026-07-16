"use client";

import { useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Plus,
  ExternalLink,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import Pagination, { usePagination } from "@/components/ui/pagination";

interface Article {
  id: string;
  slug: string;
  title: string;
  category: string;
  date: string;
  read_time: string;
  published: boolean;
}

export default function ArticlesListPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/articles")
      .then((r) => r.json())
      .then((res) => {
        setArticles(res.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { startTransition(() => { setPage(1); }); }, [articles]);

  const { paginated, total } = usePagination(articles, page, 20);

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--pm-black)" }}
    >
      <PageHeader
        title="Articles"
        subtitle="Manage blog posts and insights published on the public website."
      />

      <div className="page-content">
        <div
          className="mb-6 flex items-center justify-between"
          style={{ padding: "0 4px" }}
        >
          <span
            className="text-[12px] font-mono"
            style={{ color: "var(--pm-gray-5)" }}
          >
            {articles.length} article{articles.length !== 1 ? "s" : ""}
          </span>
          <Button variant="primary" size="sm" onClick={() => router.push("/app/content/articles/new")}>
            <Plus className="w-3.5 h-3.5" />
            New Article
          </Button>
        </div>

        {loading ? (
          <div
            className="text-center py-16 text-[13px]"
            style={{ color: "var(--pm-gray-5)" }}
          >
            Loading articles...
          </div>
        ) : articles.length === 0 ? (
          <div
            className="text-center py-16"
            style={{ color: "var(--pm-gray-5)" }}
          >
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <div className="text-[13px] mb-1">No articles yet</div>
            <div className="text-[12px]">
              Create your first article to get started.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {paginated.map((a) => (
              <div
                key={a.id}
                className="pm-dash-card flex items-center gap-4 px-5 py-4"
              >
                <FileText
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: "var(--pm-yellow)" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[14px] font-medium truncate"
                      style={{ color: "var(--pm-white)" }}
                    >
                      {a.title}
                    </span>
                    {a.published ? (
                      <CheckCircle
                        className="w-3.5 h-3.5 flex-shrink-0"
                        style={{ color: "var(--pm-green)" }}
                      />
                    ) : (
                      <XCircle
                        className="w-3.5 h-3.5 flex-shrink-0"
                        style={{ color: "var(--pm-gray-5)" }}
                      />
                    )}
                  </div>
                  <div
                    className="flex items-center gap-3 text-[11px]"
                    style={{ color: "var(--pm-gray-5)" }}
                  >
                    <span>{a.category}</span>
                    <span>·</span>
                    <span>{a.date}</span>
                    <span>·</span>
                    <span>{a.read_time}</span>
                    <span>·</span>
                    <span
                      style={{
                        color: a.published
                          ? "var(--pm-green)"
                          : "var(--pm-gray-5)",
                      }}
                    >
                      {a.published ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/insights/${a.slug}`}
                    target="_blank"
                    className="p-2 rounded-md transition-colors"
                    style={{ color: "var(--pm-gray-5)" }}
                    title="View on site"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/app/content/articles/${a.id}`}
                    className="p-2 rounded-md transition-colors"
                    style={{ color: "var(--pm-gray-5)" }}
                    title="Edit"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
