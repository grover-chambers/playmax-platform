"use client";

import { useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Plus, ExternalLink, Eye } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/articles");
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setArticles(json.data || []);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to load articles",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => { startTransition(() => { setPage(1); }); }, [articles]);

  const { paginated, total } = usePagination(articles, page, 20);

  return (
    <div className="page-content space-y-5">
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-5 text-[13px]">
          Loading articles…
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20 text-red text-[13px]">
          {error}
        </div>
      ) : (
        <>
          <PageHeader
            title="Articles"
            subtitle={`${articles.length} article${articles.length !== 1 ? "s" : ""}`}
            actions={
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push("/app/content/articles/new")}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> New Article
              </Button>
            }
          />

          <div className="ws-panel overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--ws-border)] bg-[var(--ws-bg)]">
                  {["Title", "Category", "Date", "Read Time", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        className="font-mono text-[10px] font-semibold text-gray-4 tracking-widest uppercase text-left px-4 py-3"
                      >
                        {h}
                      </th>
                    ),
                  )}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {paginated.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-[var(--ws-border)] hover:bg-[var(--ws-bg)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 flex-shrink-0 text-[var(--ws-accent)]" />
                        <span className="text-[13px] font-medium truncate max-w-75 text-[var(--ws-text)]">
                          {a.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-4">
                      {a.category}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-4 font-mono">
                      {a.date}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-4">
                      {a.read_time}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`pm-dash-bdg ${a.published ? "pm-dash-bdg-g" : "pm-dash-bdg-n"}`}
                      >
                        {a.published ? "PUBLISHED" : "DRAFT"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/insights/${a.slug}`}
                          target="_blank"
                          className="p-1.5 rounded-md hover:bg-[var(--ws-bg)] transition-colors text-gray-4 hover:text-[var(--ws-accent)]"
                          title="View on site"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/app/content/articles/${a.id}`}
                          className="p-1.5 rounded-md hover:bg-[var(--ws-bg)] transition-colors text-gray-4 hover:text-[var(--ws-accent)]"
                          title="Edit"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {paginated.length === 0 && (
              <div className="py-12 text-center text-[13px] text-gray-5">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-40 text-gray-5" />
                No articles yet. Create your first article to get started.
              </div>
            )}
          </div>
          <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
