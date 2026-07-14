"use client";

import React, { useState } from "react";
import { Store, Package, Building2, Tags } from "lucide-react";
import PageHeader from "@/components/layout/page-header";

type DimTab = "branches" | "categories" | "manufacturers" | "products";

const tabs: { key: DimTab; label: string; icon: React.ElementType }[] = [
  { key: "branches", label: "Branches", icon: Store },
  { key: "categories", label: "Categories", icon: Tags },
  { key: "manufacturers", label: "Manufacturers", icon: Building2 },
  { key: "products", label: "Products", icon: Package },
];

const sampleBranches = [
  { code: "NVS", name: "Naivasha Branch", city: "Naivasha", region: "Rift Valley", tier: "standard" },
  { code: "NKR", name: "Nakuru Branch", city: "Nakuru", region: "Rift Valley", tier: "standard" },
  { code: "NRK", name: "Narok Branch", city: "Narok", region: "Rift Valley", tier: "standard" },
  { code: "NPM", name: "Nampark Makongeni", city: "Nairobi", region: "Nairobi", tier: "flagship" },
  { code: "NYH", name: "Nyahururu Branch", city: "Nyahururu", region: "Rift Valley", tier: "standard" },
  { code: "MER", name: "Meru Branch", city: "Meru", region: "Eastern", tier: "standard" },
  { code: "MUA", name: "Maua Branch", city: "Maua", region: "Eastern", tier: "standard" },
  { code: "KRT", name: "Karatina Branch", city: "Karatina", region: "Central", tier: "standard" },
  { code: "THK", name: "Thika Branch", city: "Thika", region: "Central", tier: "standard" },
  { code: "ENG", name: "Engineer Branch", city: "Engineer", region: "Rift Valley", tier: "standard" },
];

const sampleCategories = [
  { name: "MAIZE FLOUR", products: 245 },
  { name: "WHEAT FLOUR", products: 138 },
  { name: "COOKING OIL", products: 89 },
  { name: "RICE", products: 67 },
  { name: "SUGAR", products: 42 },
  { name: "MILK & DAIRY", products: 156 },
  { name: "BEVERAGES", products: 312 },
  { name: "SOAP & DETERGENTS", products: 198 },
  { name: "CONFECTIONERY", products: 224 },
  { name: "CANNED GOODS", products: 78 },
];

const sampleManufacturers = [
  { name: "RAHA MILLERS", code: "RAHA", products: 34 },
  { name: "AJAB FLOUR", code: "AJAB", products: 18 },
  { name: "SUNFRESH", code: "SF", products: 27 },
  { name: "UNILEVER KE", code: "UNLVR", products: 56 },
  { name: "COCA COLA", code: "COKE", products: 12 },
];

export default function DimensionsPage() {
  const [activeTab, setActiveTab] = useState<DimTab>("branches");

  const renderTable = () => {
    switch (activeTab) {
      case "branches":
        return (
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
              {sampleBranches.map((b) => (
                <tr key={b.code} className="border-b border-[#1E1E1E] last:border-0">
                  <td className="px-4 py-2.5 text-white font-mono">{b.code}</td>
                  <td className="px-4 py-2.5 text-white">{b.name}</td>
                  <td className="px-4 py-2.5 text-gray-4">{b.city}</td>
                  <td className="px-4 py-2.5 text-gray-4">{b.region}</td>
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
        );

      case "categories":
        return (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-gray-5 font-mono border-b border-[#252525]">
                <th className="text-left px-4 py-3 font-normal">Category</th>
                <th className="text-right px-4 py-3 font-normal">Products</th>
              </tr>
            </thead>
            <tbody>
              {sampleCategories.map((c) => (
                <tr key={c.name} className="border-b border-[#1E1E1E] last:border-0">
                  <td className="px-4 py-2.5 text-white">{c.name}</td>
                  <td className="px-4 py-2.5 text-right text-gray-4 font-mono">{c.products}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "manufacturers":
        return (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-gray-5 font-mono border-b border-[#252525]">
                <th className="text-left px-4 py-3 font-normal">Manufacturer</th>
                <th className="text-left px-4 py-3 font-normal">Code</th>
                <th className="text-right px-4 py-3 font-normal">Products</th>
              </tr>
            </thead>
            <tbody>
              {sampleManufacturers.map((m) => (
                <tr key={m.name} className="border-b border-[#1E1E1E] last:border-0">
                  <td className="px-4 py-2.5 text-white">{m.name}</td>
                  <td className="px-4 py-2.5 text-gray-4 font-mono">{m.code}</td>
                  <td className="px-4 py-2.5 text-right text-gray-4 font-mono">{m.products}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "products":
        return (
          <div className="p-8 text-center text-[12px] text-gray-5">
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-5" />
            <p>13,377 products loaded from <strong className="text-white">inventory-items.xlsx</strong>.</p>
            <p className="mt-1">Search and filter functionality coming soon.</p>
          </div>
        );
    }
  };

  return (
    <div className="p-6">
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
