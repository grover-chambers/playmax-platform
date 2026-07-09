"use client";

import dynamic from "next/dynamic";

const InventoryMap = dynamic(
  () => import("@/components/InventoryMap").then((m) => m.InventoryMap),
  { ssr: false },
);

export function InventoryMapWrapper() {
  return <InventoryMap />;
}
