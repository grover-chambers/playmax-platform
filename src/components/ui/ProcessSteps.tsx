import { FileText, Search, Rocket } from "lucide-react";

const STEPS = [
  {
    Icon: FileText,
    label: "Send your brief",
    sub: "Tell us what market you're targeting.",
  },
  {
    Icon: Search,
    label: "We scope it in 24 hours",
    sub: "A tailored plan lands in your inbox.",
  },
  {
    Icon: Rocket,
    label: "Project kicks off",
    sub: "Research, strategy, or activation — we move.",
  },
];

export function ProcessSteps() {
  return (
    <div className="flex flex-col gap-5 mt-8">
      {STEPS.map(({ Icon, label, sub }, i) => (
        <div key={label} className="flex gap-4 items-start">
          <div
            style={{
              width: "36px",
              height: "36px",
              background: "rgba(244,195,0,0.1)",
              border: "1px solid rgba(244,195,0,0.2)",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={16} color="#F4C300" strokeWidth={2} aria-hidden="true" />
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--pm-white)",
                marginBottom: "2px",
              }}
            >
              {i + 1}. {label}
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--pm-gray-4)",
                lineHeight: 1.5,
              }}
            >
              {sub}
            </div>
          </div>
        </div>
      ))}
      <div
        style={{
          marginTop: "8px",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "var(--pm-yellow)",
          letterSpacing: "0.06em",
        }}
      >
        ✦ Response guaranteed within 1 business day
      </div>
    </div>
  );
}
