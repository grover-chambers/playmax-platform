import { Resend } from "resend";
import type React from "react";

const resend = new Resend(process.env.RESEND_API_KEY || "re_mock");

const domain = process.env.RESEND_DOMAIN || "resend.dev";
const fromName = "Market Link";
const localPart = domain === "resend.dev" ? "onboarding" : "hello";
const DEFAULT_FROM = `${fromName} <${localPart}@${domain}>`;
const DEFAULT_REPLY_TO = `${localPart}@${domain}`;

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  from?: string;
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  react,
  from = DEFAULT_FROM,
  replyTo = DEFAULT_REPLY_TO,
}: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[email] RESEND_API_KEY not set — skipping send", { to, subject });
    return { success: true, mock: true };
  }

  const { data, error } = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    react,
    replyTo,
  });

  if (error) {
    console.error("[email] send failed:", error);
    throw new Error(error.message);
  }

  return { success: true, id: data?.id };
}
