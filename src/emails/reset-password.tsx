interface ResetPasswordEmailProps {
  name: string;
  resetUrl: string;
}

export function ResetPasswordEmail({ name, resetUrl }: ResetPasswordEmailProps) {
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
          MARKET<span style={{ color: "#C9A04A" }}> LINK</span>
        </span>
      </div>

      <h1
        style={{
          fontSize: "24px",
          fontWeight: 700,
          fontFamily: "'Space Grotesk', sans-serif",
          margin: "0 0 8px",
          color: "#111827",
        }}
      >
        Reset your password, {name}
      </h1>

      <p style={{ fontSize: "15px", lineHeight: "1.6", color: "#4B5563", margin: "0 0 24px" }}>
        We received a request to reset your password. Click the button below to
        choose a new one. This link expires in 1 hour.
      </p>

      <a
        href={resetUrl}
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
        Reset password →
      </a>

      <p style={{ fontSize: "14px", lineHeight: "1.5", color: "#6B7280", margin: "0 0 4px" }}>
        If you didn&apos;t request a password reset, you can safely ignore this email.
      </p>

      <hr
        style={{
          border: "none",
          borderTop: "1px solid #E5E7EB",
          margin: "32px 0 16px",
        }}
      />

      <p style={{ fontSize: "12px", color: "#9CA3AF", margin: "0" }}>
        Market Link &middot; Westlands Business Park, Nairobi, Kenya
        <br />
        <a href="mailto:hello@marketlink.co.ke" style={{ color: "#9CA3AF" }}>
          hello@marketlink.co.ke
        </a>
      </p>
    </div>
  );
}
