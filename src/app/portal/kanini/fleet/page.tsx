import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import FleetView from "./fleet-view";

function FleetFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-teal" />
      <span className="ml-2 text-[12px] text-gray-5">Loading fleet &amp; assets…</span>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default function FleetPage() {
  return (
    <div className="page-content space-y-6">
      <Suspense fallback={<FleetFallback />}>
        <FleetView />
      </Suspense>
    </div>
  );
}
