import { describe, expect, it } from "vitest";
import { canAccess, getDefaultRedirect, getRoleLabel } from "@/lib/roles";

describe("canAccess", () => {
  it("denies when role is missing", () => {
    expect(canAccess(undefined, "/app/pipeline")).toBe(false);
    expect(canAccess(null, "/app/pipeline")).toBe(false);
  });

  it("grants super_admin everything in /app; portal stays client-only", () => {
    expect(canAccess("super_admin", "/app/settings")).toBe(true);
    expect(canAccess("super_admin", "/portal")).toBe(false);
  });

  it("restricts client to portal only", () => {
    expect(canAccess("client", "/portal/invoices")).toBe(true);
    expect(canAccess("client", "/app/pipeline")).toBe(false);
  });

  it("blocks staff from the client portal", () => {
    expect(canAccess("crm_staff", "/portal")).toBe(false);
    expect(canAccess("finance", "/portal/messages")).toBe(false);
  });

  it("enforces per-route staff permissions", () => {
    expect(canAccess("crm_staff", "/app/pipeline")).toBe(true);
    expect(canAccess("crm_staff", "/app/clients")).toBe(false);
    expect(canAccess("finance", "/app/invoices")).toBe(true);
    expect(canAccess("cms_admin", "/app/pipeline")).toBe(false);
  });

  it("prefix-matches nested routes to their base permission", () => {
    expect(canAccess("super_admin", "/app/admin/staff")).toBe(true);
    expect(canAccess("crm_admin", "/app/admin/audit")).toBe(false);
  });

  it("unlisted /app routes fall back to the base /app permission", () => {
    expect(canAccess("crm_staff", "/app/some-new-page")).toBe(true);
    expect(canAccess("client", "/app/some-new-page")).toBe(false);
  });
});

describe("getDefaultRedirect", () => {
  it("sends clients to the portal and staff to pipeline", () => {
    expect(getDefaultRedirect("client")).toBe("/portal");
    expect(getDefaultRedirect("crm_staff")).toBe("/app/pipeline");
    expect(getDefaultRedirect(undefined)).toBe("/login");
  });
});

describe("getRoleLabel", () => {
  it("maps known roles and falls back gracefully", () => {
    expect(getRoleLabel("super_admin")).toBe("Super Admin");
    expect(getRoleLabel("unknown_role")).toBe("unknown_role");
    expect(getRoleLabel(null)).toBe("User");
  });
});
