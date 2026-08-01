"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";

type Category = "Marketing" | "Utility" | "Authentication";

export default function SubmitTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("Marketing");
  const [content, setContent] = useState("");
  const [header, setHeader] = useState("");
  const [footer, setFooter] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSubmitting(false);
    router.push("/app/admin/whatsapp");
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Submit WhatsApp Template"
        subtitle="Create a new template for WhatsApp Business API"
        actions={
          <Button variant="secondary" size="sm" onClick={() => router.back()}>
            <ArrowLeft size={14} className="mr-1" /> Back
          </Button>
        }
      />

      <div className="ws-panel p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              Template Name
            </label>
            <input
              className="ws-input w-full"
              placeholder="e.g. welcome_greeting"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-[10px] text-gray-5 mt-1">
              Lowercase, underscores, max 512 characters
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <div className="flex gap-2">
              {(["Marketing", "Utility", "Authentication"] as Category[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`px-4 py-2 rounded-lg text-[11px] font-medium border transition-colors ${
                    category === c
                      ? "bg-[var(--ws-accent)] text-white border-[var(--ws-accent)]"
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
              Header (optional)
            </label>
            <input
              className="ws-input w-full"
              placeholder="e.g. Welcome to Market Link!"
              value={header}
              onChange={(e) => setHeader(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              Body
            </label>
            <textarea
              className="ws-input w-full resize-none"
              rows={6}
              placeholder="Hello {{1}}, thank you for choosing Market Link!"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <p className="text-[10px] text-gray-5 mt-1">
              Use {"{ "}{"1"}{" }"}, {"{ "}{"2"}{" }"} etc. for variables
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              Footer (optional)
            </label>
            <input
              className="ws-input w-full"
              placeholder="e.g. Reply STOP to opt out"
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="primary" type="submit" disabled={submitting}>
              <Send size={14} className="mr-1.5" />
              {submitting ? "Submitting..." : "Submit for Review"}
            </Button>
            <Button variant="secondary" type="button" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
