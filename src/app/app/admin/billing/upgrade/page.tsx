"use client";

import { useRouter } from "next/navigation";
import { Check, ArrowLeft } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    price: "KES 15,000",
    period: "/mo",
    desc: "For small teams getting started",
    features: [
      "Up to 5 users",
      "50 client projects",
      "Basic analytics",
      "Email support",
    ],
    cta: "Current Plan",
    active: false,
  },
  {
    name: "Pro",
    price: "KES 45,000",
    period: "/mo",
    desc: "For growing agencies",
    features: [
      "Up to 25 users",
      "Unlimited projects",
      "Advanced analytics & reports",
      "WhatsApp integration",
      "Priority support",
    ],
    cta: "Current Plan",
    active: true,
  },
  {
    name: "Enterprise",
    price: "KES 120,000",
    period: "/mo",
    desc: "For large-scale operations",
    features: [
      "Unlimited users",
      "Unlimited projects",
      "Custom reporting",
      "API access",
      "Dedicated account manager",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    active: false,
  },
];

export default function UpgradePage() {
  const router = useRouter();

  return (
    <div className="page-content">
      <PageHeader
        title="Upgrade Plan"
        subtitle="Choose the plan that fits your agency"
        actions={
          <Button variant="secondary" size="sm" onClick={() => router.back()}>
            <ArrowLeft size={14} className="mr-1" /> Back
          </Button>
        }
      />

      <div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-5xl">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 flex flex-col ${
                plan.active
                  ? "border-[var(--ws-accent)] bg-[var(--ws-accent)]/5"
                  : "border-[var(--ws-border)] bg-[var(--ws-surface)]"
              }`}
            >
              <h3 className="font-display text-lg font-bold text-[var(--ws-text)]">
                {plan.name}
              </h3>
              <p className="text-[11px] text-gray-5 mt-1">{plan.desc}</p>

              <div className="mt-4 mb-6">
                <span className="font-display text-3xl font-bold text-[var(--ws-text)]">
                  {plan.price}
                </span>
                <span className="text-[11px] text-gray-5 ml-1">
                  {plan.period}
                </span>
              </div>

              <ul className="space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[12px] text-gray-4">
                    <Check size={14} className="text-green mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.active ? "primary" : "secondary"}
                className="mt-6 w-full"
                onClick={() => {
                  if (!plan.active) router.push("/app/admin/billing");
                }}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
