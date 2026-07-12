import { createServerClient } from "@supabase/ssr";
import { sendEmail } from "./email";
import { OnboardingEmail } from "@/emails/onboarding";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export interface OnboardClientParams {
  email: string;
  name: string;
  company: string;
}

export async function onboardClient({ email, name, company }: OnboardClientParams) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.warn("[onboarding] SUPABASE_SERVICE_ROLE_KEY not set — skipping auth user creation");
    return { success: false, reason: "no_service_role_key" };
  }

  const tempPassword = generateTempPassword();

  const adminClient = createServerClient(supabaseUrl, serviceRoleKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });

  const { data: existing } = await adminClient.auth.admin.listUsers();
  const alreadyExists = existing?.users.find((u) => u.email === email);

  if (alreadyExists) {
    await adminClient.auth.admin.updateUserById(alreadyExists.id, {
      password: tempPassword,
      user_metadata: { name, role: "client", company },
    });
  } else {
    const { error } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name, role: "client", company },
    });
    if (error) throw new Error(error.message);
  }

  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/portal/login`;

  await sendEmail({
    to: email,
    subject: `Welcome to PlayMax, ${name} — your account is ready`,
    react: OnboardingEmail({
      name,
      email,
      tempPassword,
      loginUrl,
    }),
  });

  return { success: true, tempPassword };
}
