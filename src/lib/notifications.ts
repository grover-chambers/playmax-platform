import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type NotificationType = "deliverable" | "invoice" | "message" | "booking" | "milestone" | "general";

interface CreateNotificationInput {
  clientId: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  // Sanitize link — only allow /portal/* paths in client-facing notifications
  const safeLink = input.link && input.link.startsWith("/portal") ? input.link : null;

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
  const { error } = await supabase.from("notifications").insert({
    client_id: input.clientId,
    type: input.type,
    title: input.title,
    message: input.message || null,
    link: safeLink,
    read: false,
  });
  if (error) console.error("Failed to create notification:", error);
}

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
