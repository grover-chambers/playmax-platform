"use client";

import React, { useState, useEffect, startTransition } from "react";
import {
  BarChart3,
  TrendingUp,
  Package,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import PageHeader from "@/components/layout/page-header";

// ── Types ────────────────────────────────────────────────────────

interface SalesData {
  id: string;
  period: { label: string; year: number; quarter: number; month: number } | null;
  branch: { name: string; code: string } | null;
  category: { name: string } | null;
  product: { name: string; stock_code: string } | null;
  quantity: number;
  total_amount: number;
  cost_amount: number;
  weight_tonnes: number;
}

interface InventoryData {
  id: string;
  snapshot_date: string;
  branch: { name: string; code: string } | null;
  product: { name: string; stock_code: string } | null;
  quantity_on_hand: number;
  unit_cost: number;
  total_value: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function formatCurrency(amount: number | null | undefined): string {
  const num = amount ?? 0;
  if (num >= 1_000_000) return `KES ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `KES ${(num / 1_000).toFixed(0)}K`;
  return `KES ${num.toLocaleString()}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-GB", { maximumFractionDigits: 1 });
}

// ── Component ────────────────────────────────────────────────────

export default function PortalAnalyticsPage() {
  const [tab, setTab] = useState<"sales" | "inventory">("sales");
  const [sales, setSales] = useState<SalesData[]>([]);
  const [inventory, setInventory] = useState<InventoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/portal/analytics");
        const data = await res.json();

        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        setSales(data.sales || []);
        setInventory(data.inventory || []);
        startTransition(() => setLoading(false));
      } catch {
        startTransition(() => {
          setError("Failed to load analytics data");
          setLoading(false);
        });
      }
    };
    fetchAnalytics();
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

  const totalSalesRevenue = sales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
  const totalSalesQty = sales.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
  const totalInventoryValue = inventory.reduce((sum, i) => sum + (Number(i.total_value) || 0), 0);
  const totalInventoryQty = inventory.reduce((sum, i) => sum + (Number(i.quantity_on_hand) || 0), 0);

  const salesByProduct = sales.reduce<Record<string, { name: string; qty: number; revenue: number; code: string }>>((acc, s) => {
    const key = s.product?.stock_code || "unknown";
    if (!acc[key]) acc[key] = { name: s.product?.name || key, qty: 0, revenue: 0, code: key };
    acc[key].qty += Number(s.quantity) || 0;
    acc[key].revenue += Number(s.total_amount) || 0;
    return acc;
  }, {});

  const invByProduct = inventory.reduce<Record<string, { name: string; qty: number; value: number; code: string }>>((acc, i) => {
    const key = i.product?.stock_code || "unknown";
    if (!acc[key]) acc[key] = { name: i.product?.name || key, qty: 0, value: 0, code: key };
    acc[key].qty += Number(i.quantity_on_hand) || 0;
    acc[key].value += Number(i.total_value) || 0;
    return acc;
  }, {});

  return (
    <div className="page-content">
      <PageHeader
        title="Analytics Insights"
        subtitle={
          sales.length > 0 || inventory.length > 0
            ? `${sales.length} sales records · ${inventory.length} inventory snapshots`
            : "Analytics data shared by your account manager"
        }
      />

      {error && (
        <div className="pm-dash-alert pm-dash-alert-y mb-6">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {sales.length === 0 && inventory.length === 0 && !error ? (
        <div className="pm-dash-card p-8 text-center">
          <BarChart3 size={40} className="mx-auto mb-4 text-gray-5 opacity-30" />
          <div className="font-display text-[14px] font-semibold mb-2">No Analytics Data Yet</div>
          <div className="text-[12px] text-gray-4 max-w-md mx-auto">
            Your account manager will share analytics insights here once data is approved for your view.
            This includes sales performance, inventory levels, and product metrics.
          </div>
        </div>
      ) : (
        <>
          {/* ── KPI Summary ──────────────────────────── */}
          <div className="pm-dash-krow pm-dash-krow-4 mb-6">
            <div className="pm-dash-kcard">
              <div className="pm-dash-kn">{formatCurrency(totalSalesRevenue)}</div>
              <div className="pm-dash-kl">Total Revenue</div>
              <div className="pm-dash-ksub">{formatNumber(totalSalesQty)} units sold</div>
            </div>
            <div className="pm-dash-kcard grn">
              <div className="pm-dash-kn grn">{formatNumber(totalInventoryQty)}</div>
              <div className="pm-dash-kl">Units in Stock</div>
              <div className="pm-dash-ksub">{Object.keys(invByProduct).length} products</div>
            </div>
            <div className="pm-dash-kcard blu">
              <div className="pm-dash-kn blu">{formatCurrency(totalInventoryValue)}</div>
              <div className="pm-dash-kl">Inventory Value</div>
              <div className="pm-dash-ksub">current stock</div>
            </div>
            <div className="pm-dash-kcard red">
              <div className="pm-dash-kn red">{Object.keys(salesByProduct).length}</div>
              <div className="pm-dash-kl">Products Sold</div>
              <div className="pm-dash-ksub">across all periods</div>
            </div>
          </div>

          {/* ── Tab Bar ──────────────────────────────── */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTab("sales")}
              className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                tab === "sales"
                  ? "bg-teal text-white"
                  : "bg-black-3 border border-[#252525] text-gray-4 hover:text-white"
              }`}
            >
              <TrendingUp size={13} className="inline mr-1.5" />
              Sales Performance
            </button>
            <button
              onClick={() => setTab("inventory")}
              className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                tab === "inventory"
                  ? "bg-teal text-white"
                  : "bg-black-3 border border-[#252525] text-gray-4 hover:text-white"
              }`}
            >
              <Package size={13} className="inline mr-1.5" />
              Inventory Levels
            </button>
          </div>

          {/* ── Sales Tab ────────────────────────────── */}
          {tab === "sales" && (
            <div className="pm-dash-card pm-dash-card-b-0 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1A1A1A]">
                    {["Product", "Stock Code", "Units Sold", "Revenue", "Avg Price"].map((h) => (
                      <th key={h} className="font-mono text-[9px] text-gray-5 tracking-widest uppercase text-left px-4 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.values(salesByProduct)
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((row) => {
                      const avgPrice = row.qty > 0 ? row.revenue / row.qty : 0;
                      return (
                        <tr key={row.code} className="border-b border-[#1A1A1A] hover:bg-white/2 transition-colors">
                          <td className="px-4 py-3 text-[13px] font-semibold">{row.name}</td>
                          <td className="px-4 py-3 text-[12px] text-gray-4 font-mono">{row.code}</td>
                          <td className="px-4 py-3 text-[13px]">{formatNumber(row.qty)}</td>
                          <td className="px-4 py-3 text-[13px] font-display font-bold text-teal">{formatCurrency(row.revenue)}</td>
                          <td className="px-4 py-3 text-[12px] text-gray-4">{formatCurrency(avgPrice)}</td>
                        </tr>
                      );
                    })}
                  {Object.keys(salesByProduct).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[12px] text-gray-4">
                        No sales data available for the shared periods
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Inventory Tab ────────────────────────── */}
          {tab === "inventory" && (
            <div className="pm-dash-card pm-dash-card-b-0 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1A1A1A]">
                    {["Product", "Stock Code", "Qty on Hand", "Unit Cost", "Total Value"].map((h) => (
                      <th key={h} className="font-mono text-[9px] text-gray-5 tracking-widest uppercase text-left px-4 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.values(invByProduct)
                    .sort((a, b) => b.value - a.value)
                    .map((row) => {
                      const unitCost = row.qty > 0 ? row.value / row.qty : 0;
                      return (
                        <tr key={row.code} className="border-b border-[#1A1A1A] hover:bg-white/2 transition-colors">
                          <td className="px-4 py-3 text-[13px] font-semibold">{row.name}</td>
                          <td className="px-4 py-3 text-[12px] text-gray-4 font-mono">{row.code}</td>
                          <td className="px-4 py-3 text-[13px]">{formatNumber(row.qty)}</td>
                          <td className="px-4 py-3 text-[12px] text-gray-4">{formatCurrency(unitCost)}</td>
                          <td className="px-4 py-3 text-[13px] font-display font-bold text-teal">{formatCurrency(row.value)}</td>
                        </tr>
                      );
                    })}
                  {Object.keys(invByProduct).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[12px] text-gray-4">
                        No inventory data available for the shared periods
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
