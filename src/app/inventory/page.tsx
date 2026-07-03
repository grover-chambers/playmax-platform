"use client";

import { useState } from "react";
import { MapPin, Filter } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/layout";

interface InventoryItem {
  id: string;
  type: "Digital Screen" | "Billboard" | "Banner" | "Backlit";
  name: string;
  location: string;
  area: string;
  specs: string;
  price: number;
  status: "available" | "booked";
}

const allInventory: InventoryItem[] = [
  {
    id: "1",
    type: "Digital Screen",
    name: "Westlands Roundabout — Screen A",
    location: "Westlands, Nairobi",
    area: "Westlands",
    specs: "6×3m · 1080p LED",
    price: 85000,
    status: "available",
  },
  {
    id: "2",
    type: "Digital Screen",
    name: "Westlands Roundabout — Screen B",
    location: "Westlands, Nairobi",
    area: "Westlands",
    specs: "6×3m · 1080p LED",
    price: 85000,
    status: "available",
  },
  {
    id: "3",
    type: "Billboard",
    name: "Mombasa Road Super-size",
    location: "Industrial Area",
    area: "Industrial Area",
    specs: "12×4m · Static",
    price: 120000,
    status: "available",
  },
  {
    id: "4",
    type: "Billboard",
    name: "CBD Upper Hill Junction",
    location: "Upper Hill",
    area: "Upper Hill",
    specs: "8×3m · Backlit",
    price: 95000,
    status: "booked",
  },
  {
    id: "5",
    type: "Digital Screen",
    name: "Thika Road — Safari Park",
    location: "Kasarani, Nairobi",
    area: "Kasarani",
    specs: "4×2.5m · 4K LED",
    price: 65000,
    status: "available",
  },
  {
    id: "6",
    type: "Billboard",
    name: "Nyayo Stadium Roundabout",
    location: "South C, Nairobi",
    area: "South C",
    specs: "10×4m · Static",
    price: 110000,
    status: "booked",
  },
  {
    id: "7",
    type: "Banner",
    name: "Kenyatta Avenue Banner — East",
    location: "CBD, Nairobi",
    area: "CBD",
    specs: "3×1.5m · Flex print",
    price: 35000,
    status: "available",
  },
  {
    id: "8",
    type: "Backlit",
    name: "Lavington Road — Yaya Centre",
    location: "Kilimani, Nairobi",
    area: "Kilimani",
    specs: "6×3m · Backlit",
    price: 75000,
    status: "available",
  },
  {
    id: "9",
    type: "Billboard",
    name: "Waiyaki Way — Uthiru",
    location: "Uthiru, Nairobi",
    area: "Uthiru",
    specs: "8×3m · Static",
    price: 70000,
    status: "available",
  },
];

const typeFilters = ["All", "Digital Screen", "Billboard", "Banner", "Backlit"];

export default function InventoryPage() {
  const [typeFilter, setTypeFilter] = useState("All");
  const [availabilityFilter, setAvailabilityFilter] = useState<
    "all" | "available" | "booked"
  >("all");

  const filtered = allInventory.filter((item) => {
    if (typeFilter !== "All" && item.type !== typeFilter) return false;
    if (availabilityFilter === "available" && item.status !== "available")
      return false;
    if (availabilityFilter === "booked" && item.status !== "booked")
      return false;
    return true;
  });

  return (
    <>
      <SiteHeader />

      <section className="bg-black">
        <div className="site-container pt-28 md:pt-36 pb-12 md:pb-16">
          <div className="eyebrow mb-3 md:mb-4">Media Rentals</div>
          <h1 className="text-hero mb-6 md:mb-8">
            Available <span className="accent">inventory</span>
          </h1>
          <p className="body-copy max-w-[560px]">
            Browse billboards, digital screens, and banner sites across Nairobi.
            Filter by type and availability to find the right fit for your
            campaign.
          </p>
        </div>
      </section>

      <div className="bg-black-2 border-y border-[#1A1A1A]">
        <div className="site-container py-3.5 flex gap-3 items-center overflow-x-auto">
          <Filter className="w-4 h-4 text-gray-5 flex-shrink-0" />
          {typeFilters.map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`filter-pill ${typeFilter === f ? "active" : ""}`}
            >
              {f}
            </button>
          ))}
          <div className="w-px h-5 bg-[#333] mx-1" />
          <button
            onClick={() =>
              setAvailabilityFilter(
                availabilityFilter === "all"
                  ? "available"
                  : availabilityFilter === "available"
                    ? "booked"
                    : "all",
              )
            }
            className={`filter-pill ${availabilityFilter !== "all" ? "active" : ""}`}
          >
            {availabilityFilter === "all"
              ? "All status"
              : availabilityFilter === "available"
                ? "Available only"
                : "Booked only"}
          </button>
        </div>
      </div>

      <section className="bg-black-2">
        <div className="site-container section">
          <div className="text-[12px] text-gray-5 mb-6 md:mb-8">
            Showing {filtered.length} of {allInventory.length} sites
          </div>
          <div className="inventory-grid">
            {filtered.map((item) => {
              const isAvailable = item.status === "available";
              return (
                <div key={item.id} className="inventory-card">
                  <div className="inventory-card-img !h-[180px]">
                    <MapPin className="w-12 h-12 text-gray-5" />
                    <span
                      className={`inventory-card-badge badge ${isAvailable ? "badge-available" : "badge-booked"}`}
                    >
                      {isAvailable ? "AVAILABLE" : "BOOKED"}
                    </span>
                  </div>
                  <div className="inventory-card-body">
                    <div className="inventory-type">{item.type}</div>
                    <div className="inventory-name !text-[16px] md:!text-[18px]">
                      {item.name}
                    </div>
                    <div className="inventory-location mb-4">
                      {item.location} · {item.specs}
                    </div>
                  </div>
                  <div className="inventory-card-footer">
                    <div className="inventory-price">
                      KES {item.price.toLocaleString()}{" "}
                      <span className="inventory-price-unit">/month</span>
                    </div>
                    <div className="text-[11px] text-gray-4">
                      {isAvailable ? "Inquire →" : "Join waitlist →"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-gray-5 text-[14px]">
              No sites match your current filters.
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
