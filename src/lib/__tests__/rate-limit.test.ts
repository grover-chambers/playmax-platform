import { describe, expect, it } from "vitest";
import { getClientIp, hashClientKey, rateLimitResponse } from "@/lib/rate-limit";

function reqWithHeaders(headers: Record<string, string>): Request {
  return new Request("https://example.com/api/leads", { headers });
}

describe("getClientIp", () => {
  it("uses the LAST x-forwarded-for hop (Vercel appends the real IP last)", () => {
    const req = reqWithHeaders({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(req)).toBe("5.6.7.8");
  });

  it("handles a single hop", () => {
    expect(getClientIp(reqWithHeaders({ "x-forwarded-for": "9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("never trusts x-real-ip", () => {
    expect(getClientIp(reqWithHeaders({ "x-real-ip": "1.1.1.1" }))).toBe("127.0.0.1");
  });

  it("falls back to loopback when no proxy headers exist", () => {
    expect(getClientIp(reqWithHeaders({}))).toBe("127.0.0.1");
  });
});

describe("hashClientKey", () => {
  it("is deterministic and does not leak the raw key", () => {
    const a = hashClientKey("5.6.7.8");
    const b = hashClientKey("5.6.7.8");
    expect(a).toBe(b);
    expect(a).not.toContain("5.6.7.8");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs for different clients", () => {
    expect(hashClientKey("1.1.1.1")).not.toBe(hashClientKey("2.2.2.2"));
  });
});

describe("rateLimitResponse", () => {
  it("returns a 429 with Retry-After and an error envelope", async () => {
    const res = rateLimitResponse(12.4);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("13");
    const body = await res.json();
    expect(body.error.code).toBe("rate_limited");
  });
});
