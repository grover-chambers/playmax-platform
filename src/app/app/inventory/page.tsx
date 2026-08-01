"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LayoutGrid,
  List,
  MapPin,
  SlidersHorizontal,
  Package,
  CheckCircle2,
  Clock,
  DollarSign,
} from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import SearchBox from "@/components/ui/search-box";
import FilterPill from "@/components/ui/filter-pill";
import InventoryCardFull from "@/components/inventory/inventory-card-full";
import dynamic from "next/dynamic";
import InventoryDetailPanel from "@/components/inventory/inventory-detail-panel";
import BookingModal from "@/components/inventory/booking-modal";
import { createClient } from "@/lib/supabase/browser";
import { InventoryItem, Booking } from "@/lib/types";

const InventoryMapView = dynamic(
  () => import("@/components/inventory/inventory-map-view"),
  { ssr: false, loading: () => <div className="flex items-center justify-center py-20 text-gray-5 text-[13px]">Loading map...</div> },
);

/* ── raw row shape returned by Supabase ──────────────── */
interface RawInventoryRow {
  id: string;
  type: string;
  name: string;
  location: string;
  area: string | null;
  size: string | null;
  resolution: string | null;
  daily_impressions: number | null;
  price: number;
  status: string | null;
  created_at?: string;
  booked_by?: string | null;
  booked_until?: string | null;
}

/* ── map snake_case DB row → camelCase InventoryItem ─── */
function mapInventoryItem(row: RawInventoryRow): InventoryItem {
  return {
    id: row.id,
    type: (row.type as InventoryItem["type"]) || "Billboard",
    name: row.name,
    location: row.location,
    area: row.area || row.location,
    size: row.size || "—",
    resolution: row.resolution || "—",
    dailyImpressions: row.daily_impressions || 0,
    price: row.price,
    status: (row.status as InventoryItem["status"]) || "available",
    bookedBy: row.booked_by || undefined,
    bookedUntil: row.booked_until || undefined,
  };
}

/* ── constants ────────────────────────────────────────── */
const typeFilters = ["All", "Billboard", "Digital Screen", "Banner Site"];
const viewModes = ["grid", "list", "map"] as const;

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [showBookingModal, setShowBookingModal] = useState(false);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── fetch inventory from API route ──────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/inventory");
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        const items: InventoryItem[] = (json.inventory || []).map(
          mapInventoryItem,
        );
        setInventory(items);
        if (items.length > 0) setSelectedItemId(items[0].id);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to load inventory",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── fetch clients for BookingModal ──────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("clients")
          .select("id, name")
          .order("name");
        if (data) setClients(data);
      } catch {
        /* clients list is optional — silently ignore */
      }
    })();
  }, []);

  /* ── derived data ────────────────────────────────────── */
  const filtered = useMemo(
    () =>
      inventory.filter((item) => {
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
      }),
    [inventory, typeFilter, availableOnly, search],
  );

  const activeItem = useMemo(
    () => inventory.find((i) => i.id === selectedItemId) || inventory[0],
    [inventory, selectedItemId],
  );

  const totalSites = inventory.length;
  const availableSites = inventory.filter(
    (i) => i.status === "available",
  ).length;
  const bookedSites = totalSites - availableSites;
  const monthlyRevenue = inventory
    .filter((i) => i.status === "booked")
    .reduce((sum, i) => sum + i.price, 0);

  /* ── booking confirm handler ─────────────────────────── */
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

  /* ── header actions (filters, search, view toggle) ──── */
  const headerActions = (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 bg-[var(--ws-bg)] border border-[var(--ws-border)] rounded p-0.5">
        {viewModes.map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              viewMode === mode
                ? "bg-[var(--ws-accent)]/10 text-[var(--ws-accent)]"
                : "text-gray-5 hover:text-gray-3"
            }`}
          >
            {mode === "grid" && <LayoutGrid className="w-3.5 h-3.5" />}
            {mode === "list" && <List className="w-3.5 h-3.5" />}
            {mode === "map" && <MapPin className="w-3.5 h-3.5" />}
          </button>
        ))}
      </div>

      <SearchBox
        placeholder="Search inventory…"
        className="w-48"
        value={search}
        onChange={setSearch}
      />


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

      <button
        onClick={() => setAvailableOnly(!availableOnly)}
        className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
          availableOnly
            ? "bg-green/10 border-green/20 text-green"
            : "border-[var(--ws-border)] text-gray-4 hover:text-[var(--ws-text)]"
        }`}
      >
        <SlidersHorizontal className="w-3 h-3" />
        Available only
      </button>
    </div>
  );

  /* ── render ──────────────────────────────────────────── */
  return (
    <div className="page-content space-y-5">
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-5 text-[13px]">
          Loading inventory…
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20 text-red text-[13px]">
          {error}
        </div>
      ) : (
        <>
          <PageHeader
            title="Inventory"
            subtitle={`${filtered.length} of ${totalSites} sites`}
            actions={headerActions}
          />

          {/* ── KPI row ────────────────────────────────── */}
          <div className="pm-dash-krow px-7 pb-4">
            <div className="pm-dash-kcard">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-3.5 h-3.5 text-gray-5" />
                <span className="text-[10px] text-gray-5 uppercase tracking-wider font-mono">
                  Total Sites
                </span>
              </div>
              <div className="pm-dash-kn">{totalSites}</div>
            </div>

            <div className="pm-dash-kcard">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-green" />
                <span className="text-[10px] text-gray-5 uppercase tracking-wider font-mono">
                  Available
                </span>
              </div>
              <div className="pm-dash-kn grn">{availableSites}</div>
            </div>

            <div className="pm-dash-kcard">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-[var(--ws-accent)]" />
                <span className="text-[10px] text-gray-5 uppercase tracking-wider font-mono">
                  Booked
                </span>
              </div>
              <div className="pm-dash-kn blu">{bookedSites}</div>
            </div>

            <div className="pm-dash-kcard">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-[var(--ws-accent)]" />
                <span className="text-[10px] text-gray-5 uppercase tracking-wider font-mono">
                  Monthly Revenue
                </span>
              </div>
              <div className="pm-dash-kn">
                KES {monthlyRevenue.toLocaleString()}
              </div>
            </div>
          </div>

          {/* ── main content area ──────────────────────── */}
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              {/* ── grid view ──────────────────────────── */}
              {viewMode === "grid" && (
                <div className="px-7 py-5 grid grid-cols-2 gap-4 overflow-y-auto">
                  {filtered.map((item) => (
                    <InventoryCardFull
                      key={item.id}
                      item={item}
                      isActive={item.id === selectedItemId}
                      onClick={() => setSelectedItemId(item.id)}
                    />
                  ))}
                  {filtered.length === 0 && (
                    <div className="col-span-2 py-16 text-center text-[13px] text-gray-5">
                      No inventory matches your current filters.
                    </div>
                  )}
                </div>
              )}

              {/* ── list view ──────────────────────────── */}
              {viewMode === "list" && (
                <div className="px-7 py-5 overflow-y-auto">
                  <div className="pm-dash-card pm-dash-card-b-0 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[var(--ws-border)]">
                          {[
                            "Name",
                            "Type",
                            "Location",
                            "Size",
                            "Impressions",
                            "Price",
                            "Status",
                          ].map((h) => (
                            <th
                              key={h}
                              className="font-mono text-[9px] text-gray-5 tracking-widest uppercase text-left px-4 py-3"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((item) => (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedItemId(item.id)}
                            className={`border-b border-[var(--ws-border)] hover:bg-[var(--ws-bg)] transition-colors cursor-pointer ${
                              item.id === selectedItemId
                                ? "bg-[var(--ws-accent)]/[0.03]"
                                : ""
                            }`}
                          >
                            <td className="px-4 py-3 font-display text-[13px] font-semibold">
                              {item.name}
                            </td>
                            <td className="px-4 py-3 text-[12px] text-gray-4">
                              {item.type}
                            </td>
                            <td className="px-4 py-3 text-[12px] text-gray-4">
                              {item.location}
                            </td>
                            <td className="px-4 py-3 text-[12px] text-gray-4 font-mono">
                              {item.size}
                            </td>
                            <td className="px-4 py-3 text-[12px] text-gray-4 font-mono">
                              {item.dailyImpressions.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-[13px] font-display font-bold text-[var(--ws-accent)]">
                              KES {item.price.toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`pm-dash-bdg ${
                                  item.status === "available"
                                    ? "pm-dash-bdg-g"
                                    : "pm-dash-bdg-y"
                                }`}
                              >
                                {item.status === "available"
                                  ? "AVAILABLE"
                                  : "BOOKED"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filtered.length === 0 && (
                      <div className="py-12 text-center text-[13px] text-gray-5">
                        No inventory matches your current filters.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── map view ─────────────────────────────── */}
              {viewMode === "map" && (
                <InventoryMapView inventory={filtered} />
              )}
            </div>

            {/* ── detail panel ─────────────────────────── */}
            {activeItem && (
              <InventoryDetailPanel
                item={activeItem}
                onBook={() => setShowBookingModal(true)}
              />
            )}
          </div>

          {/* ── booking modal ──────────────────────────── */}
          {showBookingModal && activeItem && (
            <BookingModal
              item={activeItem}
              bookings={bookings}
              clients={clients}
              onClose={() => setShowBookingModal(false)}
              onConfirm={handleBookingConfirm}
            />
          )}
        </>
      )}
    </div>
  );
}
