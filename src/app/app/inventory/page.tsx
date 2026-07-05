"use client";

import { useState } from "react";
import { LayoutGrid, List, MapPin, SlidersHorizontal } from "lucide-react";
import SearchBox from "@/components/ui/search-box";
import FilterPill from "@/components/ui/filter-pill";
import InventoryCardFull from "@/components/inventory/inventory-card-full";
import InventoryDetailPanel from "@/components/inventory/inventory-detail-panel";
import BookingModal from "@/components/inventory/booking-modal";
import { sampleInventory, sampleBookings, sampleClients } from "@/lib/data";
import { Booking } from "@/lib/types";

const typeFilters = ["All", "Billboard", "Digital Screen", "Banner Site"];
const viewModes = ["grid", "list", "map"] as const;

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const [selectedItem, setSelectedItem] = useState<string>(
    sampleInventory[0].id,
  );
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>(sampleBookings);

  const filtered = sampleInventory.filter((item) => {
    if (typeFilter !== "All" && item.type !== typeFilter) return false;
    if (availableOnly && item.status !== "available") return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.area.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeItem =
    sampleInventory.find((i) => i.id === selectedItem) || sampleInventory[0];

  const handleBookingConfirm = (bookingData: {
    clientId: string;
    clientName: string;
    inventoryId: string;
    inventoryName: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
  }) => {
    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      ...bookingData,
      status: "pending",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setBookings((prev) => [...prev, newBooking]);
    setShowBookingModal(false);
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-4 border-b border-[#1A1A1A] bg-black flex items-center gap-3">
          <h1 className="font-display text-[15px] font-bold mr-4">Inventory</h1>
          <div className="flex gap-1 bg-black-3 border border-[#252525] rounded-sm p-0.5">
            {viewModes.map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-1.5 rounded-sm transition-colors cursor-pointer ${
                  viewMode === mode
                    ? "bg-yellow/10 text-yellow"
                    : "text-gray-5 hover:text-gray-3"
                }`}
              >
                {mode === "grid" && <LayoutGrid className="w-3.5 h-3.5" />}
                {mode === "list" && <List className="w-3.5 h-3.5" />}
                {mode === "map" && <MapPin className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
          <div className="w-[200px]">
            <SearchBox
              placeholder="Search inventory..."
              value={search}
              onChange={setSearch}
            />
          </div>
          <div className="h-5 w-px bg-[#333] mx-1" />
          <div className="flex gap-1.5">
            {typeFilters.map((f) => (
              <FilterPill
                key={f}
                active={typeFilter === f}
                onClick={() => setTypeFilter(f)}
              >
                {f}
              </FilterPill>
            ))}
          </div>
          <div className="h-5 w-px bg-[#333] mx-1" />
          <button
            onClick={() => setAvailableOnly(!availableOnly)}
            className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
              availableOnly
                ? "bg-green/10 border-green/20 text-green"
                : "border-[#333] text-gray-4 hover:text-white"
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            Available only
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-[#0D0D0D]">
          <div className="text-[11px] text-gray-5 mb-4">
            Showing {filtered.length} of {sampleInventory.length} sites
          </div>
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((item) => (
              <InventoryCardFull
                key={item.id}
                item={item}
                isActive={item.id === selectedItem}
                onClick={() => setSelectedItem(item.id)}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-[13px] text-gray-5">
              No inventory matches your current filters.
            </div>
          )}
        </div>
      </div>

      <InventoryDetailPanel
        item={activeItem}
        onBook={() => setShowBookingModal(true)}
      />

      {showBookingModal && (
        <BookingModal
          item={activeItem}
          bookings={bookings}
          clients={sampleClients}
          onClose={() => setShowBookingModal(false)}
          onConfirm={handleBookingConfirm}
        />
      )}
    </div>
  );
}
