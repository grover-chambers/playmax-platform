interface InventoryCardImageProps {
  name: string;
  location: string;
  status: "available" | "booked";
}

export function InventoryCardImage({
  name,
  location,
  status,
}: InventoryCardImageProps) {
  return (
    <div className="pm-inventory-card-img">
      {/* Diagonal stripe texture */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.08]"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id={`diag-${name.replace(/\s/g, "")}`}
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="14"
              stroke="#F4C300"
              strokeWidth="1.5"
            />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={`url(#diag-${name.replace(/\s/g, "")})`}
        />
      </svg>

      {/* Location + name overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 z-10">
        <div
          className="mb-1"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            color: "var(--pm-yellow)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {location}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "15px",
            fontWeight: 700,
            color: "var(--pm-white)",
            lineHeight: 1.2,
          }}
        >
          {name}
        </div>
      </div>

      {/* Status badge */}
      <span
        className={`pm-badge absolute top-2.5 right-2.5 z-10 ${
          status === "available" ? "pm-badge-available" : "pm-badge-booked"
        }`}
      >
        {status === "available" ? "AVAILABLE" : "BOOKED"}
      </span>
    </div>
  );
}
