"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import Button from "@/components/ui/button";
import PageHeader from "@/components/layout/page-header";

const uploads = [
  { file: "inventory-items.xlsx", date: "10 Jul 2026", period: "—", rows: 13377, errors: 0, status: "imported" },
  { file: "sales_of_products_by_date_2026-05-08_2026-07-07.xlsx", date: "08 May 2026", period: "May–Jul 2026", rows: 142, errors: 5, status: "failed" },
];

export default function UploadHistoryPage() {
  const router = useRouter();

  return (
    <div className="p-6">
      <PageHeader
        title="Upload History"
        subtitle="All XLSX files ingested into the analytics engine"
        actions={
          <Button variant="secondary" size="sm" onClick={() => router.push("/app/analytics/upload")}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to upload
          </Button>
        }
      />

      <div className="mt-5 border border-[#252525] rounded-lg bg-black-3 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-gray-5 font-mono border-b border-[#252525]">
              <th className="text-left px-4 py-3 font-normal">File</th>
              <th className="text-left px-4 py-3 font-normal">Date</th>
              <th className="text-left px-4 py-3 font-normal">Period</th>
              <th className="text-right px-4 py-3 font-normal">Rows</th>
              <th className="text-right px-4 py-3 font-normal">Errors</th>
              <th className="text-center px-4 py-3 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {uploads.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-5">
                  No uploads yet.
                </td>
              </tr>
            )}
            {uploads.map((u) => (
              <tr key={u.file} className="border-b border-[#1E1E1E] last:border-0">
                <td className="px-4 py-2.5 text-white font-medium">{u.file}</td>
                <td className="px-4 py-2.5 text-gray-4">{u.date}</td>
                <td className="px-4 py-2.5 text-gray-4">{u.period}</td>
                <td className="px-4 py-2.5 text-right text-gray-4 font-mono">{u.rows.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right text-gray-4 font-mono">{u.errors}</td>
                <td className="px-4 py-2.5 text-center">
                  {u.status === "imported" ? (
                    <CheckCircle className="w-3.5 h-3.5 inline text-green" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 inline text-red" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
