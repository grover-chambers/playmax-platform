import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import DeliveriesView from "./deliveries-view";

function DeliveriesFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-teal" />
      <span className="ml-2 text-[12px] text-gray-5">Loading deliveries…</span>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default function DeliveriesPage() {
  return (
    <div className="page-content space-y-6">
      <Suspense fallback={<DeliveriesFallback />}>
        <DeliveriesView />
      </Suspense>
    </div>
  );
}
