import { z } from "zod";

export const leadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().min(1, "Company is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  service_interest: z.string().min(1, "Service interest is required"),
  description: z.string().optional(),
  source: z.string().optional(),
  intent: z.string().optional(),
});

export const bookingSchema = z.object({
  inventory_id: z.string().min(1, "Inventory ID is required"),
  client_id: z.string().min(1, "Client ID is required"),
  project_id: z.string().optional(),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  total_price: z.coerce.number().positive("Total price must be positive"),
  status: z.string().optional().default("pending"),
  notes: z.string().optional(),
});

export const checkoutSchema = z.object({
  priceId: z.string().min(1, "Price ID is required"),
});

export const emailSendSchema = z.object({
  type: z.enum(["onboarding", "reset_password", "notification"]),
  to: z.string().email("Valid recipient email required"),
  subject: z.string().min(1, "Subject is required"),
  templateData: z.object({
    clientName: z.string().optional(),
    projectName: z.string().optional(),
    kitName: z.string().optional(),
  }).optional(),
});

export const chartTypeSchema = z.enum(["number", "bar", "line", "pie"]);

const metricKeyPattern = /^[a-z0-9_]+$/;

export const ingestMetricSchema = z.object({
  key: z
    .string()
    .min(1, "Metric key is required")
    .max(80)
    .regex(metricKeyPattern, "Metric key must be lowercase snake_case"),
  label: z.string().min(1, "Metric label is required").max(120),
  value: z.number().finite("Metric value must be a finite number"),
  unit: z.string().max(20).optional().default(""),
  chart_type: chartTypeSchema.optional().default("number"),
  sort_order: z.number().int().min(0).max(999).optional().default(0),
});

// Route group codes from NAMPARK master data
const routeGroupOptions = ['RG-A', 'RG-B', 'RG-C', 'RG-D', 'RG-E', 'RG-F', 'RG-G'] as const;

export const moduleEventSchema = z.object({
  event_id: z.string().uuid("event_id must be a UUID"),
  source: z.string().min(1).max(40).optional().default("nampark"),
  tenant_id: z.string().uuid("tenant_id must be a UUID").optional(),
  client_id: z.string.uuid("Valid client_id UUID required"),
  event_type: z.string().min(1).max(60).optional().default("route_metrics"),
  occurred_at: z
    .string()
    .min(10, "occurred_at must be an ISO 8601 timestamp")
    .max(40),
  period_label: z.string().max(60).optional(),
  metrics: z.array(ingestMetricSchema).min(1).max(50),
  route_group: z.string().optional()
    .refine((val) => !val || routeGroupOptions.includes(val), {
      message: "route_group must be one of: RG-A, RG-B, RG-C, RG-D, RG-E, RG-F, RG-G",
    }),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type EmailSendInput = z.infer<typeof emailSendSchema>;
export type ModuleEventInput = z.infer<typeof moduleEventSchema>;
export type IngestMetric = z.infer<typeof ingestMetricSchema>;

// Rep provisioning request -> POST /api/admin/field-team (forwarded to the
// NAMPARK RMS admin API). Passwords are never accepted from clients — the
// server generates one and returns it in the response.
export const fieldTeamActionSchema = z.object({
  action: z.enum(["create", "deactivate"]),
  email: z.string().email("Valid rep email required"),
  name: z.string().min(1).max(120).optional(),
  phone: z.string().min(1).max(40).optional(),
});

export type FieldTeamActionInput = z.infer<typeof fieldTeamActionSchema>;