import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/portal", () => ({
  getPortalClient: vi.fn(),
}));

import { getPortalClient } from "@/lib/portal";
import { requirePortalClient, subscriptionRequiredResponse } from "@/lib/portal-guard";

const mockGetPortalClient = vi.mocked(getPortalClient);

function makeSupabase() {
  return {} as Parameters<typeof requirePortalClient>[0];
}

beforeEach(() => {
  mockGetPortalClient.mockReset();
});

describe("requirePortalClient", () => {
  it("401s when there is no authenticated user", async () => {
    const result = await requirePortalClient(makeSupabase(), null);
    expect(result.response?.status).toBe(401);
    expect(result.client).toBeUndefined();
  });

  it("403s staff roles even if a legacy client_users link exists", async () => {
    for (const role of ["super_admin", "cms_admin", "crm_admin", "crm_staff", "finance"]) {
      const result = await requirePortalClient(makeSupabase(), {
        id: "u1",
        role: role as never,
      });
      expect(result.response?.status).toBe(403);
      const body = await result.response!.json();
      expect(body.code).toBe("PORTAL_STAFF_FORBIDDEN");
    }
    expect(mockGetPortalClient).not.toHaveBeenCalled();
  });

  it("rejects role-less callers instead of defaulting to client", async () => {
    const result = await requirePortalClient(makeSupabase(), { id: "u1", role: undefined as never });
    expect(result.response?.status).toBe(403);
    const body = await result.response!.json();
    expect(body.code).toBe("PORTAL_ROLE_REQUIRED");
  });

  it("404s when no client record is linked", async () => {
    mockGetPortalClient.mockResolvedValue(null);
    const result = await requirePortalClient(makeSupabase(), { id: "u1", role: "client" });
    expect(result.response?.status).toBe(404);  });

  it("returns the linked client for an explicit client role", async () => {
    const client = {
      id: "c1",
      name: "Kanini",
      email: null,
      company: null,
      industry: null,
      phone: null,
      status: "active",
      created_at: new Date().toISOString(),
      linked_supplier_id: null,
      subscription_tier: "pro",
    };
    mockGetPortalClient.mockResolvedValue(client);
    const result = await requirePortalClient(makeSupabase(), { id: "u1", role: "client" });
    expect(result.response).toBeUndefined();
    expect(result.client?.id).toBe("c1");
    expect(result.role).toBe("client");
  });
});

describe("subscriptionRequiredResponse", () => {
  it("returns the 402 paywall envelope", () => {
    const res: NextResponse = subscriptionRequiredResponse();
    expect(res.status).toBe(402);
  });
});
