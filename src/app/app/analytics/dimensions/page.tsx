"use client";

import React, { useState, useEffect } from "react";
import { Store, Package, Building2, Tags, Loader2 } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Pagination, { usePagination } from "@/components/ui/pagination";
import type {
  AnalyticsBranch,
  AnalyticsCategory,
  AnalyticsManufacturer,
} from "@/lib/analytics-types";

type DimTab = "branches" | "categories" | "manufacturers" | "products";

const tabs: { key: DimTab; label: string; icon: React.ElementType }[] = [
  { key: "branches", label: "Branches", icon: Store },
  { key: "categories", label: "Categories", icon: Tags },
  { key: "manufacturers", label: "Manufacturers", icon: Building2 },
  { key: "products", label: "Products", icon: Package },
];

export default function DimensionsPage() {
  const [activeTab, setActiveTab] = useState<DimTab>("branches");
  const [branches, setBranches] = useState<AnalyticsBranch[]>([]);
  const [categories, setCategories] = useState<AnalyticsCategory[]>([]);
  const [manufacturers, setManufacturers] = useState<AnalyticsManufacturer[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [branchPage, setBranchPage] = useState(1);
  const [categoryPage, setCategoryPage] = useState(1);
  const [manufacturerPage, setManufacturerPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/analytics/dimensions");
        if (!res.ok) throw new Error("Failed to load dimensions");
        const data = await res.json();
        setBranches(data.branches ?? []);
        setCategories(data.categories ?? []);
        setManufacturers(data.manufacturers ?? []);
        setProductCount(data.productCount ?? 0);
        setBranchPage(1);
        setCategoryPage(1);
        setManufacturerPage(1);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const { paginated: paginatedBranches, total: totalBranches } = usePagination(branches, branchPage, 20);
  const { paginated: paginatedCategories, total: totalCategories } = usePagination(categories, categoryPage, 20);
  const { paginated: paginatedManufacturers, total: totalManufacturers } = usePagination(manufacturers, manufacturerPage, 20);

  const renderTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-4 h-4 text-gray-5 animate-spin" />
          <span className="ml-2 text-[11px] text-gray-5">Loading dimensions...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-8 text-center text-[12px] text-red">{error}</div>
      );
    }

    switch (activeTab) {
      case "branches":
        return (
          <>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-gray-5 font-mono border-b border-[#252525]">
                <th className="text-left px-4 py-3 font-normal">Code</th>
                <th className="text-left px-4 py-3 font-normal">Name</th>
                <th className="text-left px-4 py-3 font-normal">City</th>
                <th className="text-left px-4 py-3 font-normal">Region</th>
                <th className="text-left px-4 py-3 font-normal">Tier</th>
              </tr>
            </thead>
            <tbody>
              {branches.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-5">No branches found.</td>
                </tr>
              )}
              {paginatedBranches.map((b) => (
                <tr key={b.id} className="border-b border-[#1E1E1E] last:border-0">
                  <td className="px-4 py-2.5 text-white font-mono">{b.code}</td>
                  <td className="px-4 py-2.5 text-white">{b.name}</td>
                  <td className="px-4 py-2.5 text-gray-4">{b.city ?? "—"}</td>
                  <td className="px-4 py-2.5 text-gray-4">{b.region ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${
                      b.tier === "flagship"
                        ? "bg-yellow/10 text-yellow border-yellow/20"
                        : b.tier === "express"
                          ? "bg-blue/10 text-blue border-blue/20"
                          : "bg-transparent text-gray-4 border-[#2A2A2A]"
                    }`}>
                      {b.tier}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={branchPage} pageSize={20} total={totalBranches} onPageChange={setBranchPage} />
          </>
        );

      case "categories":
        return (
          <>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-gray-5 font-mono border-b border-[#252525]">
                <th className="text-left px-4 py-3 font-normal">Category</th>
                <th className="text-left px-4 py-3 font-normal">Description</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 && (
                <tr>
                  <td colSpan={2} className="text-center py-8 text-gray-5">No categories found.</td>
                </tr>
              )}
              {paginatedCategories.map((c) => (
                <tr key={c.id} className="border-b border-[#1E1E1E] last:border-0">
                  <td className="px-4 py-2.5 text-white">{c.name}</td>
                  <td className="px-4 py-2.5 text-gray-4">{c.description ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={categoryPage} pageSize={20} total={totalCategories} onPageChange={setCategoryPage} />
          </>
        );

      case "manufacturers":
        return (
          <>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-gray-5 font-mono border-b border-[#252525]">
                <th className="text-left px-4 py-3 font-normal">Manufacturer</th>
                <th className="text-left px-4 py-3 font-normal">Code</th>
              </tr>
            </thead>
            <tbody>
              {manufacturers.length === 0 && (
                <tr>
                  <td colSpan={2} className="text-center py-8 text-gray-5">No manufacturers found.</td>
                </tr>
              )}
              {paginatedManufacturers.map((m) => (
                <tr key={m.id} className="border-b border-[#1E1E1E] last:border-0">
                  <td className="px-4 py-2.5 text-white">{m.name}</td>
                  <td className="px-4 py-2.5 text-gray-4 font-mono">{m.code ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={manufacturerPage} pageSize={20} total={totalManufacturers} onPageChange={setManufacturerPage} />
          </>
        );

      case "products":
        return (
          <div className="p-8 text-center text-[12px] text-gray-5">
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-5" />
            <p>
              <strong className="text-white">{productCount.toLocaleString()}</strong> products loaded.
            </p>
            <p className="mt-1">Search and filter functionality coming soon.</p>
          </div>
        );
    }
  };

  return (
    <div className="page-content">
      <PageHeader
        title="Dimensions"
        subtitle="Manage branches, categories, manufacturers, and products"
      />

      {/* Tabs */}
      <div className="flex gap-1 mt-5 border-b border-[#252525]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-[11px] font-medium border-b-2 transition-all cursor-pointer ${
                isActive
                  ? "border-yellow text-white"
                  : "border-transparent text-gray-5 hover:text-gray-3"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="border border-[#252525] border-t-0 rounded-b-lg bg-black-3 overflow-hidden">
        {renderTable()}
      </div>
    </div>
  );
}
