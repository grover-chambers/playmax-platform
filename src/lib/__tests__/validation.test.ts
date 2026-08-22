import { describe, expect, it } from "vitest";
import {
  bookingSchema,
  checkoutSchema,
  emailSendSchema,
  leadSchema,
  moduleEventSchema,
} from "@/lib/validation";

const UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("leadSchema", () => {
  it("accepts a valid lead", () => {
    const parsed = leadSchema.safeParse({
      name: "Jane",
      company: "Acme",
      email: "jane@acme.com",
      service_interest: "route_mapping",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects missing required fields and bad emails", () => {
    expect(
      leadSchema.safeParse({ name: "", company: "Acme", email: "jane@acme.com", service_interest: "x" })
        .success,
    ).toBe(false);
    expect(
      leadSchema.safeParse({ name: "J", company: "Acme", email: "not-an-email", service_interest: "x" })
        .success,
    ).toBe(false);
  });
});

describe("bookingSchema", () => {
  it("coerces numeric strings for total_price and defaults status", () => {
    const parsed = bookingSchema.parse({
      inventory_id: "inv1",
      client_id: UUID,
      start_date: "2026-01-01",
      end_date: "2026-02-01",
      total_price: "1500",
    });
    expect(parsed.total_price).toBe(1500);
    expect(parsed.status).toBe("pending");
  });

  it("rejects non-positive prices", () => {
    expect(
      bookingSchema.safeParse({
        inventory_id: "inv1",
        client_id: UUID,
        start_date: "2026-01-01",
        end_date: "2026-02-01",
        total_price: -5,
      }).success,
    ).toBe(false);
  });
});

describe("checkoutSchema", () => {
  it("requires a priceId", () => {
    expect(checkoutSchema.safeParse({ priceId: "price_123" }).success).toBe(true);
    expect(checkoutSchema.safeParse({}).success).toBe(false);
  });
});

describe("emailSendSchema", () => {
  it("restricts type to known templates and validates recipient", () => {
    expect(
      emailSendSchema.safeParse({
        type: "onboarding",
        to: "a@b.com",
        subject: "Welcome",
      }).success,
    ).toBe(true);
    expect(
      emailSendSchema.safeParse({ type: "other", to: "a@b.com", subject: "s" }).success,
    ).toBe(false);
    expect(
      emailSendSchema.safeParse({ type: "notification", to: "bad", subject: "s" }).success,
    ).toBe(false);
  });
});

describe("moduleEventSchema", () => {
  const base = {
    event_id: UUID,
    client_id: UUID,
    occurred_at: new Date().toISOString(),
    metrics: [{ key: "visits_total", label: "Visits", value: 146 }],
  };

  it("accepts a valid module event and applies defaults", () => {
    const parsed = moduleEventSchema.parse(base);
    expect(parsed.source).toBe("nampark");
    expect(parsed.event_type).toBe("route_metrics");
    expect(parsed.metrics[0].chart_type).toBe("number");
  });

  it("rejects non-UUID identifiers", () => {
    expect(moduleEventSchema.safeParse({ ...base, event_id: "nope" }).success).toBe(false);
    expect(moduleEventSchema.safeParse({ ...base, client_id: "nope" }).success).toBe(false);
  });

  it("enforces snake_case metric keys", () => {
    expect(
      moduleEventSchema.safeParse({
        ...base,
        metrics: [{ key: "Visits Total", label: "Visits", value: 1 }],
      }).success,
    ).toBe(false);
  });

  it("requires at least one metric", () => {
    expect(moduleEventSchema.safeParse({ ...base, metrics: [] }).success).toBe(false);
  });
});
