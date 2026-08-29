import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ProfitabilityView from "./profitability-view";

function ProfitabilityFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-teal" />
      <span className="ml-2 text-[12px] text-gray-5">Loading profitability…</span>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default function ProfitabilityPage() {
  return (
    <div className="page-content space-y-6">
      <Suspense fallback={<ProfitabilityFallback />}>
        <ProfitabilityView />
      </Suspense>
    </div>
  );
}
