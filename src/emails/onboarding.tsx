interface OnboardingEmailProps {
  name: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}

export function OnboardingEmail({ name, email, tempPassword, loginUrl }: OnboardingEmailProps) {
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
        Welcome to Market Link, {name}
      </h1>

      <p style={{ fontSize: "15px", lineHeight: "1.6", color: "#4B5563", margin: "0 0 24px" }}>
        Your client account has been created. You can now access your portal to view
        projects, invoices, reports, and deliverables.
      </p>

      <div
        style={{
          backgroundColor: "#F9FAFB",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "24px",
          border: "1px solid #E5E7EB",
        }}
      >
        <p style={{ fontSize: "13px", fontWeight: 600, color: "#6B7280", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Your login credentials
        </p>
        <p style={{ fontSize: "14px", color: "#111827", margin: "0 0 4px" }}>
          <strong>Email:</strong> {email}
        </p>
        <p style={{ fontSize: "14px", color: "#111827", margin: "0" }}>
          <strong>Temporary password:</strong>{" "}
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              backgroundColor: "#E8E2CC",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "13px",
            }}
          >
            {tempPassword}
          </span>
        </p>
      </div>

      <a
        href={loginUrl}
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
        Log in to your portal →
      </a>

      <p style={{ fontSize: "14px", lineHeight: "1.5", color: "#6B7280", margin: "0 0 4px" }}>
        You&apos;ll be prompted to set a new password on your first login. If you didn&apos;t
        expect this email, please ignore it or contact us.
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
