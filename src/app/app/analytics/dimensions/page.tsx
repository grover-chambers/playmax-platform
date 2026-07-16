"use client";

import React, { useState, useEffect } from "react";
import { Store, Package, Building2, Tags, Loader2 } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Pagination, { usePagination } from "@/components/ui/pagination";
import type {
  AnalyticsBranch,
  AnalyticsCategory,
  AnalyticsManufacturer,
  AnalyticsProductWithJoins,
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
  const [products, setProducts] = useState<AnalyticsProductWithJoins[]>([]);
  const [branchPage, setBranchPage] = useState(1);
  const [categoryPage, setCategoryPage] = useState(1);
  const [manufacturerPage, setManufacturerPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/analytics/dimensions?include_products=true");
        if (!res.ok) throw new Error("Failed to load dimensions");
        const data = await res.json();
        setBranches(data.branches ?? []);
        setCategories(data.categories ?? []);
        setManufacturers(data.manufacturers ?? []);
        setProducts(data.products ?? []);
        setBranchPage(1);
        setCategoryPage(1);
        setManufacturerPage(1);
        setProductPage(1);
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
  const { paginated: paginatedProducts, total: totalProducts } = usePagination(products, productPage, 20);

  const renderTable = () => {
    if (loading) {
      return (
        <div className="pm-dash-card">
          <div className="pm-dash-card-b flex items-center justify-center py-12">
            <Loader2 className="w-4 h-4 text-gray-5 animate-spin" />
            <span className="ml-2 text-[11px] text-gray-5">Loading dimensions...</span>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="pm-dash-card">
          <div className="pm-dash-card-b text-center text-[12px] text-red py-8">{error}</div>
        </div>
      );
    }

    switch (activeTab) {
      case "branches":
        return (
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[14px]">Branches</span>
              <span className="pm-dash-bdg pm-dash-bdg-n">{totalBranches} total</span>
            </div>
            <div className="pm-dash-card-b-0 overflow-x-auto">
              <table className="pm-dash-tbl">
                <thead>
                  <tr>
                    <th className="pm-dash-tbl-th">Code</th>
                    <th className="pm-dash-tbl-th">Name</th>
                    <th className="pm-dash-tbl-th">City</th>
                    <th className="pm-dash-tbl-th">Region</th>
                    <th className="pm-dash-tbl-th">Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.length === 0 && (
                    <tr>
                      <td colSpan={5} className="pm-dash-tbl-td text-center py-8">No branches found.</td>
                    </tr>
                  )}
                  {paginatedBranches.map((b) => (
                    <tr key={b.id}>
                      <td className="pm-dash-tbl-td font-mono text-white">{b.code}</td>
                      <td className="pm-dash-tbl-td text-white font-medium">{b.name}</td>
                      <td className="pm-dash-tbl-td">{b.city ?? "—"}</td>
                      <td className="pm-dash-tbl-td">{b.region ?? "—"}</td>
                      <td className="pm-dash-tbl-td">
                        <span className={`pm-dash-bdg ${
                          b.tier === "flagship"
                            ? "pm-dash-bdg-y"
                            : b.tier === "express"
                              ? "pm-dash-bdg-b"
                              : "pm-dash-bdg-n"
                        }`}>
                          {b.tier}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={branchPage} pageSize={20} total={totalBranches} onPageChange={setBranchPage} />
          </div>
        );

      case "categories":
        return (
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[14px]">Categories</span>
              <span className="pm-dash-bdg pm-dash-bdg-n">{totalCategories} total</span>
            </div>
            <div className="pm-dash-card-b-0 overflow-x-auto">
              <table className="pm-dash-tbl">
                <thead>
                  <tr>
                    <th className="pm-dash-tbl-th">Category</th>
                    <th className="pm-dash-tbl-th">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={2} className="pm-dash-tbl-td text-center py-8">No categories found.</td>
                    </tr>
                  )}
                  {paginatedCategories.map((c) => (
                    <tr key={c.id}>
                      <td className="pm-dash-tbl-td text-white font-medium">{c.name}</td>
                      <td className="pm-dash-tbl-td">{c.description ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={categoryPage} pageSize={20} total={totalCategories} onPageChange={setCategoryPage} />
          </div>
        );

      case "manufacturers":
        return (
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[14px]">Manufacturers</span>
              <span className="pm-dash-bdg pm-dash-bdg-n">{totalManufacturers} total</span>
            </div>
            <div className="pm-dash-card-b-0 overflow-x-auto">
              <table className="pm-dash-tbl">
                <thead>
                  <tr>
                    <th className="pm-dash-tbl-th">Manufacturer</th>
                    <th className="pm-dash-tbl-th">Code</th>
                  </tr>
                </thead>
                <tbody>
                  {manufacturers.length === 0 && (
                    <tr>
                      <td colSpan={2} className="pm-dash-tbl-td text-center py-8">No manufacturers found.</td>
                    </tr>
                  )}
                  {paginatedManufacturers.map((m) => (
                    <tr key={m.id}>
                      <td className="pm-dash-tbl-td text-white font-medium">{m.name}</td>
                      <td className="pm-dash-tbl-td font-mono">{m.code ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={manufacturerPage} pageSize={20} total={totalManufacturers} onPageChange={setManufacturerPage} />
          </div>
        );

      case "products":
        return (
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[14px]">Products</span>
              <span className="pm-dash-bdg pm-dash-bdg-n">{totalProducts} total</span>
            </div>
            <div className="pm-dash-card-b-0 overflow-x-auto">
              <table className="pm-dash-tbl">
                <thead>
                  <tr>
                    <th className="pm-dash-tbl-th">Stock Code</th>
                    <th className="pm-dash-tbl-th">Name</th>
                    <th className="pm-dash-tbl-th">Category</th>
                    <th className="pm-dash-tbl-th">Manufacturer</th>
                    <th className="pm-dash-tbl-th">Sub-Category</th>
                    <th className="pm-dash-tbl-th">UoM</th>
                    <th className="pm-dash-tbl-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={7} className="pm-dash-tbl-td text-center py-8">No products found.</td>
                    </tr>
                  )}
                  {paginatedProducts.map((p) => (
                    <tr key={p.id}>
                      <td className="pm-dash-tbl-td font-mono text-white">{p.stock_code}</td>
                      <td className="pm-dash-tbl-td text-white font-medium">{p.name}</td>
                      <td className="pm-dash-tbl-td">{p.category_name ?? "—"}</td>
                      <td className="pm-dash-tbl-td">{p.manufacturer_name ?? "—"}</td>
                      <td className="pm-dash-tbl-td">{p.sub_category ?? "—"}</td>
                      <td className="pm-dash-tbl-td font-mono">{p.unit_of_measure}</td>
                      <td className="pm-dash-tbl-td">
                        <span className={`pm-dash-bdg ${p.active ? "pm-dash-bdg-g" : "pm-dash-bdg-r"}`}>
                          {p.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={productPage} pageSize={20} total={totalProducts} onPageChange={setProductPage} />
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

      {/* ── KPI row ── */}
      {!loading && (
        <div className="pm-dash-krow pm-dash-krow-4">
          <div className="pm-dash-kcard">
            <div className="pm-dash-kn">{branches.length}</div>
            <div className="pm-dash-kl">Branches</div>
          </div>
          <div className="pm-dash-kcard">
            <div className="pm-dash-kn">{categories.length}</div>
            <div className="pm-dash-kl">Categories</div>
          </div>
          <div className="pm-dash-kcard">
            <div className="pm-dash-kn">{manufacturers.length}</div>
            <div className="pm-dash-kl">Manufacturers</div>
          </div>
          <div className="pm-dash-kcard">
            <div className="pm-dash-kn">{products.length}</div>
            <div className="pm-dash-kl">Products</div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="pm-dash-qa-strip">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pm-dash-qa-btn ${isActive ? "text-yellow border-yellow/40" : ""}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

<<<<<<< HEAD
      {/* Table */}
      <div className="pm-dash-card overflow-hidden">
        {renderTable()}
      </div>
=======
      {/* ── Content ── */}
      {renderTable()}
>>>>>>> 8726d9e4931e010174f6e1fba5b8f6c05e70902c
    </div>
  );
}
