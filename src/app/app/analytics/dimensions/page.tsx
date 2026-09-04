"use client";

import React, { useState, useEffect } from "react";
import { Store, Package, Building2, Tags, Loader2, Truck } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Pagination, { usePagination } from "@/components/ui/pagination";
import type {
  AnalyticsBranch,
  AnalyticsCategory,
  AnalyticsManufacturer,
  AnalyticsSupplier,
  AnalyticsProductWithJoins,
} from "@/lib/analytics-types";

type DimTab = "branches" | "categories" | "manufacturers" | "suppliers" | "products";

const tabs: { key: DimTab; label: string; icon: React.ElementType }[] = [
  { key: "branches", label: "Branches", icon: Store },
  { key: "categories", label: "Categories", icon: Tags },
  { key: "manufacturers", label: "Manufacturers", icon: Building2 },
  { key: "suppliers", label: "Suppliers", icon: Truck },
  { key: "products", label: "Products", icon: Package },
];

export default function DimensionsPage() {
  const [activeTab, setActiveTab] = useState<DimTab>("branches");
  const [branches, setBranches] = useState<AnalyticsBranch[]>([]);
  const [categories, setCategories] = useState<AnalyticsCategory[]>([]);
  const [manufacturers, setManufacturers] = useState<AnalyticsManufacturer[]>([]);
  const [suppliers, setSuppliers] = useState<AnalyticsSupplier[]>([]);
  const [products, setProducts] = useState<AnalyticsProductWithJoins[]>([]);
  const [branchPage, setBranchPage] = useState(1);
  const [categoryPage, setCategoryPage] = useState(1);
  const [manufacturerPage, setManufacturerPage] = useState(1);
  const [supplierPage, setSupplierPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutError, setMutError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<null | {
    resource: "categories" | "products";
    mode: "create" | "edit";
    record: Record<string, unknown> | null;
  }>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/analytics/dimensions?include_products=true", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load dimensions");
        const data = await res.json();
        if (cancelled) return;
        setBranches(data.branches ?? []);
        setCategories(data.categories ?? []);
        setManufacturers(data.manufacturers ?? []);
        setSuppliers(data.suppliers ?? []);
        setProducts(data.products ?? []);
        setBranchPage(1);
        setCategoryPage(1);
        setManufacturerPage(1);
        setProductPage(1);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/analytics/dimensions?include_products=true", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load dimensions");
      const data = await res.json();
      setBranches(data.branches ?? []);
      setCategories(data.categories ?? []);
      setManufacturers(data.manufacturers ?? []);
      setSuppliers(data.suppliers ?? []);
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

  async function mutate(
    resource: "categories" | "products",
    method: "POST" | "PATCH" | "DELETE",
    payload: Record<string, unknown>,
  ) {
    setBusy(true);
    setMutError(null);
    try {
      const url =
        method === "DELETE"
          ? `/api/analytics/dimensions/${resource}?id=${encodeURIComponent(payload.id as string)}`
          : `/api/analytics/dimensions/${resource}`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "DELETE" ? undefined : JSON.stringify(payload),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMutError(data?.error || "Operation failed");
        return false;
      }
      await load();
      return true;
    } catch (e: unknown) {
      setMutError(e instanceof Error ? e.message : "Operation failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const { paginated: paginatedBranches, total: totalBranches } = usePagination(branches, branchPage, 20);  const { paginated: paginatedCategories, total: totalCategories } = usePagination(categories, categoryPage, 20);
  const { paginated: paginatedManufacturers, total: totalManufacturers } = usePagination(manufacturers, manufacturerPage, 20);
  const { paginated: paginatedSuppliers, total: totalSuppliers } = usePagination(suppliers, supplierPage, 20);
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
                      <td className="pm-dash-tbl-td font-mono text-[var(--ws-text)]">{b.code}</td>
                      <td className="pm-dash-tbl-td text-[var(--ws-text)] font-medium">{b.name}</td>
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
              <div className="flex items-center gap-2">
                <span className="pm-dash-bdg pm-dash-bdg-n">{totalCategories} total</span>
                <button
                  onClick={() => setModal({ resource: "categories", mode: "create", record: null })}
                  className="pm-dash-qa-btn text-green"
                >
                  + New
                </button>
              </div>
            </div>
            <div className="pm-dash-card-b-0 overflow-x-auto">
              <table className="pm-dash-tbl">
                <thead>
                  <tr>
                    <th className="pm-dash-tbl-th">Category</th>
                    <th className="pm-dash-tbl-th">Description</th>
                    <th className="pm-dash-tbl-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={3} className="pm-dash-tbl-td text-center py-8">No categories found.</td>
                    </tr>
                  )}
                  {paginatedCategories.map((c) => (
                    <tr key={c.id}>
                      <td className="pm-dash-tbl-td text-[var(--ws-text)] font-medium">{c.name}</td>
                      <td className="pm-dash-tbl-td">{c.description ?? "—"}</td>
                      <td className="pm-dash-tbl-td">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setModal({ resource: "categories", mode: "edit", record: c as unknown as Record<string, unknown> })}
                            className="text-[11px] text-blue hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete category "${c.name}"?`)) {
                                await mutate("categories", "DELETE", { id: c.id });
                              }
                            }}
                            className="text-[11px] text-red hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
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
                      <td className="pm-dash-tbl-td text-[var(--ws-text)] font-medium">{m.name}</td>
                      <td className="pm-dash-tbl-td font-mono">{m.code ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={manufacturerPage} pageSize={20} total={totalManufacturers} onPageChange={setManufacturerPage} />
          </div>
        );

      case "suppliers":
        return (
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[14px]">Suppliers</span>
              <span className="pm-dash-bdg pm-dash-bdg-n">{totalSuppliers} total</span>
            </div>
            <div className="pm-dash-card-b-0 overflow-x-auto">
              <table className="pm-dash-tbl">
                <thead>
                  <tr>
                    <th className="pm-dash-tbl-th">Supplier</th>
                    <th className="pm-dash-tbl-th">Code</th>
                    <th className="pm-dash-tbl-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="pm-dash-tbl-td text-center py-8">No suppliers found.</td>
                    </tr>
                  )}
                  {paginatedSuppliers.map((s) => (
                    <tr key={s.id}>
                      <td className="pm-dash-tbl-td text-[var(--ws-text)] font-medium">{s.name}</td>
                      <td className="pm-dash-tbl-td font-mono">{s.code ?? "—"}</td>
                      <td className="pm-dash-tbl-td">
                        <span className={`pm-dash-bdg ${s.active ? "pm-dash-bdg-g" : "pm-dash-bdg-r"}`}>
                          {s.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={supplierPage} pageSize={20} total={totalSuppliers} onPageChange={setSupplierPage} />
          </div>
        );

      case "products":
        return (
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[14px]">Products</span>
              <div className="flex items-center gap-2">
                <span className="pm-dash-bdg pm-dash-bdg-n">{totalProducts} total</span>
                <button
                  onClick={() => setModal({ resource: "products", mode: "create", record: null })}
                  className="pm-dash-qa-btn text-green"
                >
                  + New
                </button>
              </div>
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
                    <th className="pm-dash-tbl-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={8} className="pm-dash-tbl-td text-center py-8">No products found.</td>
                    </tr>
                  )}
                  {paginatedProducts.map((p) => (
                    <tr key={p.id}>
                      <td className="pm-dash-tbl-td font-mono text-[var(--ws-text)]">{p.stock_code}</td>
                      <td className="pm-dash-tbl-td text-[var(--ws-text)] font-medium">{p.name}</td>
                      <td className="pm-dash-tbl-td">{p.category_name ?? "—"}</td>
                      <td className="pm-dash-tbl-td">{p.manufacturer_name ?? "—"}</td>
                      <td className="pm-dash-tbl-td">{p.sub_category ?? "—"}</td>
                      <td className="pm-dash-tbl-td font-mono">{p.unit_of_measure}</td>
                      <td className="pm-dash-tbl-td">
                        <span className={`pm-dash-bdg ${p.active ? "pm-dash-bdg-g" : "pm-dash-bdg-r"}`}>
                          {p.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="pm-dash-tbl-td">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setModal({ resource: "products", mode: "edit", record: p as unknown as Record<string, unknown> })}
                            className="text-[11px] text-blue hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete product "${p.name}"?`)) {
                                await mutate("products", "DELETE", { id: p.id });
                              }
                            }}
                            className="text-[11px] text-red hover:underline"
                          >
                            Delete
                          </button>
                        </div>
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
    <div className="page-content space-y-5">
      <PageHeader
        title="Dimensions"
        subtitle="Manage branches, categories, manufacturers, and products"
      />

      {/* ── KPI row ── */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="ws-stat-card">
            <div className="flex items-center gap-3">
              <div className="ws-stat-icon"><Store className="w-4 h-4 text-teal" /></div>
              <div>
                <div className="ws-stat-value">{branches.length}</div>
                <div className="ws-stat-label">Branches</div>
              </div>
            </div>
          </div>
          <div className="ws-stat-card">
            <div className="flex items-center gap-3">
              <div className="ws-stat-icon"><Tags className="w-4 h-4 text-blue" /></div>
              <div>
                <div className="ws-stat-value">{categories.length}</div>
                <div className="ws-stat-label">Categories</div>
              </div>
            </div>
          </div>
          <div className="ws-stat-card">
            <div className="flex items-center gap-3">
              <div className="ws-stat-icon"><Building2 className="w-4 h-4 text-green" /></div>
              <div>
                <div className="ws-stat-value">{manufacturers.length}</div>
                <div className="ws-stat-label">Manufacturers</div>
              </div>
            </div>
          </div>
          <div className="ws-stat-card">
            <div className="flex items-center gap-3">
              <div className="ws-stat-icon"><Package className="w-4 h-4 text-red" /></div>
              <div>
                <div className="ws-stat-value">{products.length}</div>
                <div className="ws-stat-label">Products</div>
              </div>
            </div>
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

      {/* ── Content ── */}
      {renderTable()}

      {mutError && (
        <div className="pm-dash-card">
          <div className="pm-dash-card-b text-[12px] text-red">{mutError}</div>
        </div>
      )}

      {modal && (
        <DimensionModal
          modal={modal}
          categories={categories}
          manufacturers={manufacturers}
          busy={busy}
          onClose={() => setModal(null)}
          onSubmit={async (resource, payload) => {
            const method = modal.mode === "create" ? "POST" : "PATCH";
            const ok = await mutate(resource, method, { ...payload, id: modal.record?.id });
            if (ok) setModal(null);
          }}
        />
      )}

    </div>
  );
}

function DimensionModal({
  modal,
  categories,
  manufacturers,
  busy,
  onClose,
  onSubmit,
}: {
  modal: {
    resource: "categories" | "products";
    mode: "create" | "edit";
    record: Record<string, unknown> | null;
  };
  categories: AnalyticsCategory[];
  manufacturers: AnalyticsManufacturer[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (resource: "categories" | "products", payload: Record<string, unknown>) => void;
}) {
  const isCategory = modal.resource === "categories";
  const [name, setName] = useState<string>((modal.record?.name as string) ?? "");
  const [description, setDescription] = useState<string>((modal.record?.description as string) ?? "");
  const [stock_code, setStockCode] = useState<string>((modal.record?.stock_code as string) ?? "");
  const [category_id, setCategoryId] = useState<string>((modal.record?.category_id as string) ?? "");
  const [manufacturer_id, setManufacturerId] = useState<string>((modal.record?.manufacturer_id as string) ?? "");
  const [sub_category, setSubCategory] = useState<string>((modal.record?.sub_category as string) ?? "");
  const [unit_of_measure, setUnitOfMeasure] = useState<string>((modal.record?.unit_of_measure as string) ?? "pcs");
  const [active, setActive] = useState<boolean>((modal.record?.active as boolean) ?? true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--ws-bg)] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-[var(--ws-text)]">
            {modal.mode === "create" ? `New ${isCategory ? "Category" : "Product"}` : `Edit ${isCategory ? "Category" : "Product"}`}
          </h3>
          <button onClick={onClose} className="text-gray-5 hover:text-[var(--ws-text)]">✕</button>
        </div>

        <div className="space-y-3">
          {isCategory ? (
            <>
              <Field label="Name" value={name} onChange={setName} required />
              <Field label="Description" value={description} onChange={setDescription} />
            </>
          ) : (
            <>
              <Field label="Name" value={name} onChange={setName} required />
              <Field label="Stock Code" value={stock_code} onChange={setStockCode} required />
              <label className="block text-[11px] text-gray-5">
                Category
                <select
                  value={category_id}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-[var(--ws-bg)] px-2 py-1.5 text-[12px] text-[var(--ws-text)]"
                >
                  <option value="">Select category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-[11px] text-gray-5">
                Manufacturer
                <select
                  value={manufacturer_id}
                  onChange={(e) => setManufacturerId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-[var(--ws-bg)] px-2 py-1.5 text-[12px] text-[var(--ws-text)]"
                >
                  <option value="">Select manufacturer…</option>
                  {manufacturers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>
              <Field label="Sub-Category" value={sub_category} onChange={setSubCategory} />
              <Field label="Unit of Measure" value={unit_of_measure} onChange={setUnitOfMeasure} />
              <label className="flex items-center gap-2 text-[11px] text-gray-5">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                Active
              </label>
            </>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-[12px] text-gray-5 hover:text-[var(--ws-text)]">
            Cancel
          </button>
          <button
            disabled={busy || !name || (!isCategory && !stock_code)}
            onClick={() =>
              onSubmit(
                modal.resource,
                isCategory ? { name, description } : { name, stock_code, category_id, manufacturer_id, sub_category, unit_of_measure, active },
              )
            }
            className="rounded-md bg-teal px-4 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : modal.mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-[11px] text-gray-5">
      {label}
      {required && <span className="text-red"> *</span>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-white/10 bg-[var(--ws-bg)] px-2 py-1.5 text-[12px] text-[var(--ws-text)]"
      />
    </label>
  );
}
