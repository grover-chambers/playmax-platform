export interface Conversation {
  id: string;
  contactName: string;
  contactInitials: string;
  channel: "whatsapp" | "email";
  preview: string;
  time: string;
  unread: number;
  projectName?: string;
  pipelineValue?: string;
  status: "open" | "closed";
  autoReply?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  text: string;
  time: string;
  channel: "whatsapp" | "email";
  senderName?: string;
  isAutomation?: boolean;
}

export interface InventoryItem {
  id: string;
  type: "Digital Screen" | "Billboard" | "Banner Site" | "Backlit";
  name: string;
  location: string;
  area: string;
  size: string;
  resolution: string;
  dailyImpressions: number;
  price: number;
  status: "available" | "booked";
  bookedBy?: string;
  bookedUntil?: string;
  imageGradient?: string;
}

/* ── Roles ─────────────────────────────────────────── */
export type UserRole =
  | "super_admin" // Full platform control
  | "cms_admin" // Content management + staff management
  | "crm_admin" // CRM modules + staff pipeline assignment
  | "crm_staff" // Limited CRM (assigned tasks/projects)
  | "finance" // Invoices, billing
  | "client"; // Portal only

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  cms_admin: "CMS Admin",
  crm_admin: "CRM Admin",
  crm_staff: "CRM Staff",
  finance: "Finance",
  client: "Client",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin:
    "Full platform control — manage users, create client accounts, approve pipeline projects",
  cms_admin: "Manage website content and add staff with defined roles",
  crm_admin:
    "Oversee CRM — pipeline, clients, projects, and assign staff to pipeline stages",
  crm_staff: "View assigned tasks, projects, and conversations",
  finance: "Billing, invoices, and payment management",
  client: "Client portal access only",
};

export interface StaffMember {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: "active" | "inactive";
  createdAt: string;
}

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  inventoryId: string;
  inventoryName: string;
  startDate: string;
  endDate: string;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  totalPrice: number;
  createdAt: string;
}
