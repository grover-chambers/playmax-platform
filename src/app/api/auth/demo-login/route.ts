import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const DEMO_PASSWORD = "Demo123!";

const DEMO_ACCOUNTS: Record<string, { email: string; role: string }> = {
  super_admin: { email: "demo.superadmin@playmax.com", role: "super_admin" },
  crm_admin: { email: "demo.crmadmin@playmax.com", role: "crm_admin" },
  crm_staff: { email: "demo.crmstaff@playmax.com", role: "crm_staff" },
  cms_admin: { email: "demo.cmsadmin@playmax.com", role: "cms_admin" },
  finance: { email: "demo.finance@playmax.com", role: "finance" },
  client: { email: "demo.client@playmax.com", role: "client" },
};

export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json();
    const account = DEMO_ACCOUNTS[role];
    if (!account) {
      return NextResponse.json({ error: "Invalid demo role" }, { status: 400 });
    }

    const cookieStore = await cookies();

    // Create a Supabase client (uses anon key — same as browser)
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    });

    // 1. Try sign in first
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: account.email,
        password: DEMO_PASSWORD,
      });

    if (signInData?.session) {
      return NextResponse.json({
        session: signInData.session,
        role: account.role,
        redirect: role === "client" ? "/portal" : getRedirectPath(account.role),
      });
    }

    // 2. Sign-in failed — try sign up (creates the user if they don't exist)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email: account.email,
        password: DEMO_PASSWORD,
        options: {
          data: {
            name: account.role
              .replace("_", " ")
              .replace(/\b\w/g, (c) => c.toUpperCase()),
            role: account.role,
          },
        },
      },
    );

    if (signUpData?.user && !signUpError) {
      // User was created — now sign them in
      const { data: loginData } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: DEMO_PASSWORD,
      });

      if (loginData?.session) {
        return NextResponse.json({
          session: loginData.session,
          role: account.role,
          redirect:
            role === "client" ? "/portal" : getRedirectPath(account.role),
        });
      }

      // Sign-up succeeded but auto-sign-in failed — likely email confirmation required
      return NextResponse.json({
        requiresConfirmation: true,
        email: account.email,
        message: "Account created! Check your email to confirm, then sign in.",
      });
    }

    // 3. Both failed
    return NextResponse.json(
      {
        error: signUpError?.message || signInError?.message || "Login failed",
      },
      { status: 401 },
    );
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function getRedirectPath(role: string): string {
  const routes: Record<string, string> = {
    super_admin: "/app",
    crm_admin: "/app/pipeline",
    crm_staff: "/app/my-day",
    cms_admin: "/app/content",
    finance: "/app/invoices",
    client: "/portal",
  };
  return routes[role] || "/app";
}
