import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { sendEmail } from "@/lib/email";
import { OnboardingEmail } from "@/emails/onboarding";
import { ResetPasswordEmail } from "@/emails/reset-password";
import { NotificationEmail } from "@/emails/notification";
import { sanitizeError } from "@/lib/errors";
import { rateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const EMAIL_TYPES = {
  onboarding: OnboardingEmail,
  reset_password: ResetPasswordEmail,
  notification: NotificationEmail,
} as const;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(`email:${ip}`, { windowMs: 60_000, maxRequests: 5 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type } = body;

    const Template = EMAIL_TYPES[type as keyof typeof EMAIL_TYPES];
    if (!Template) {
      return NextResponse.json({ error: "Invalid email type" }, { status: 400 });
    }

    const result = await sendEmail({
      to: body.to,
      subject: body.subject,
      react: Template(body.templateData || {}),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
