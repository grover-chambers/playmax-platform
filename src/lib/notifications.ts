import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type NotificationType =
  | "deliverable" | "invoice" | "message" | "booking" | "milestone" | "general"
  | "new_lead" | "task_assigned" | "project_update" | "payment_received";

interface CreateNotificationInput {
  clientId?: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    },
  );

  const record: Record<string, unknown> = {
    type: input.type,
    title: input.title,
    message: input.message || null,
    link: input.link || null,
    read: false,
  };

  if (input.clientId) record.client_id = input.clientId;
  if (input.userId) record.user_id = input.userId;

  const { error } = await supabase.from("notifications").insert(record);
  if (error) console.error("Failed to create notification:", error);
}

/* ── Client-facing factory functions ── */

export async function createDeliverableNotification(
  clientId: string,
  deliverableTitle: string,
  projectId: string,
) {
  return createNotification({
    clientId,
    type: "deliverable",
    title: "Deliverable Ready for Review",
    message: `${deliverableTitle} has been submitted and is ready for your review.`,
    link: `/portal/deliverables?project=${projectId}`,
  });
}

export async function createApprovalNotification(
  clientId: string,
  deliverableTitle: string,
  status: "approved" | "rejected",
  feedback?: string,
) {
  const statusLabel = status === "approved" ? "approved" : "requested changes on";
  return createNotification({
    clientId,
    type: "deliverable",
    title: status === "approved" ? "Deliverable Approved" : "Changes Requested",
    message: feedback
      ? `You ${statusLabel} "${deliverableTitle}": "${feedback}"`
      : `You ${statusLabel} "${deliverableTitle}".`,
    link: `/portal/deliverables`,
  });
}

/* ── Staff-facing factory functions ── */

export async function createNewLeadNotification(
  userId: string,
  companyName: string,
  leadId: string,
) {
  return createNotification({
    userId,
    type: "new_lead",
    title: "New Lead Assigned",
    message: `${companyName} has been assigned to you.`,
    link: `/app/leads/${leadId}`,
  });
}

export async function createTaskAssignedNotification(
  userId: string,
  taskTitle: string,
  projectId: string,
) {
  return createNotification({
    userId,
    type: "task_assigned",
    title: "Task Assigned",
    message: `You've been assigned: "${taskTitle}"`,
    link: `/workspace/${projectId}`,
  });
}

export async function createProjectUpdateNotification(
  userId: string,
  projectName: string,
  update: string,
  projectId: string,
) {
  return createNotification({
    userId,
    type: "project_update",
    title: `Update: ${projectName}`,
    message: update,
    link: `/workspace/${projectId}`,
  });
}
