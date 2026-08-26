interface TeamInviteEmailProps {
  name: string;
  clientName: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}

export function TeamInviteEmail({
  name,
  clientName,
  email,
  tempPassword,
  loginUrl,
}: TeamInviteEmailProps) {
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

      <p style={{ fontSize: "15px", lineHeight: "1.6", color: "#4B5563", margin: "0 0 16px" }}>
        Hi {name || email},
      </p>

      <p style={{ fontSize: "15px", lineHeight: "1.6", color: "#4B5563", margin: "0 0 16px" }}>
        You've been added to the <strong>{clientName}</strong> team on the Market Link client
        portal.
      </p>

      <p style={{ fontSize: "15px", lineHeight: "1.6", color: "#4B5563", margin: "0 0 16px" }}>
        Use the temporary password below to sign in. You'll be asked to set your own password on
        first login.
      </p>

      <div
        style={{
          backgroundColor: "#F9FAFB",
          border: "1px solid #E5E7EB",
          borderRadius: "8px",
          padding: "16px",
          margin: "24px 0",
        }}
      >
        <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "6px" }}>Sign-in email</div>
        <div style={{ fontSize: "15px", color: "#111827", fontWeight: 600, marginBottom: "12px" }}>
          {email}
        </div>
        <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "6px" }}>
          Temporary password
        </div>
        <div
          style={{
            fontSize: "18px",
            color: "#111827",
            fontWeight: 700,
            letterSpacing: "0.04em",
            fontFamily: "monospace",
          }}
        >
          {tempPassword}
        </div>
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
        Open the Client Portal →
      </a>

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
