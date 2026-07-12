interface NotificationEmailProps {
  name: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
}

export function NotificationEmail({ name, message, actionLabel, actionUrl }: NotificationEmailProps) {
  return (
    <div
      style={{
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        maxWidth: "560px",
        margin: "0 auto",
        padding: "40px 24px",
        backgroundColor: "#ffffff",
      }}
    >
      <div style={{ marginBottom: "32px" }}>
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "28px",
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          PLAY<span style={{ color: "#FCD34D" }}>MAX</span>
        </span>
      </div>

      <p style={{ fontSize: "15px", lineHeight: "1.6", color: "#4B5563", margin: "0 0 16px" }}>
        Hi {name},
      </p>

      <p style={{ fontSize: "15px", lineHeight: "1.6", color: "#4B5563", margin: "0 0 24px" }}>
        {message}
      </p>

      {actionLabel && actionUrl && (
        <a
          href={actionUrl}
          style={{
            display: "inline-block",
            backgroundColor: "#111827",
            color: "#ffffff",
            padding: "14px 32px",
            borderRadius: "6px",
            textDecoration: "none",
            fontSize: "15px",
            fontWeight: 600,
            marginBottom: "24px",
          }}
        >
          {actionLabel} →
        </a>
      )}

      <hr
        style={{
          border: "none",
          borderTop: "1px solid #E5E7EB",
          margin: "32px 0 16px",
        }}
      />

      <p style={{ fontSize: "12px", color: "#9CA3AF", margin: "0" }}>
        PlayMax Agency &middot; Westlands Business Park, Nairobi, Kenya
        <br />
        <a href="mailto:hello@playmaxagency.co.ke" style={{ color: "#9CA3AF" }}>
          hello@playmaxagency.co.ke
        </a>
      </p>
    </div>
  );
}
