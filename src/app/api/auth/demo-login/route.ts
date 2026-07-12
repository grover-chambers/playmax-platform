import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Demo123!";

const DEMO_ACCOUNTS: Record<
  string,
  { email: string; role: string; name: string }
> = {
  super_admin: {
    email: "demo.superadmin@playmax.com",
    role: "super_admin",
    name: "Brayan",
  },
  crm_admin: {
    email: "demo.crmadmin@playmax.com",
    role: "crm_admin",
    name: "David Mutua",
  },
  crm_staff: {
    email: "demo.crmstaff@playmax.com",
    role: "crm_staff",
    name: "Amina Mwangi",
  },
  cms_admin: {
    email: "demo.cmsadmin@playmax.com",
    role: "cms_admin",
    name: "Florence Njeri",
  },
  finance: {
    email: "demo.finance@playmax.com",
    role: "finance",
    name: "Faith Opiyo",
  },
  client: {
    email: "demo.client@playmax.com",
    role: "client",
    name: "Brian Kamau",
  },
};

export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json();
    const account = DEMO_ACCOUNTS[role];
    if (!account) {
      return NextResponse.json({ error: "Invalid demo role" }, { status: 400 });
    }

    const cookieStore = await cookies();

    // ── If service role key is available, ensure the user exists with proper metadata ──
    if (serviceRoleKey) {
      const adminClient = createServerClient(supabaseUrl, serviceRoleKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {}, // admin client doesn't need to write cookies
        },
      });

      // Check if user exists
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users.find(
        (u) => u.email === account.email,
      );

      if (existingUser) {
        // User exists — update metadata if role is missing or wrong
        const currentRole = existingUser.user_metadata?.role;
        if (currentRole !== account.role) {
          await adminClient.auth.admin.updateUserById(existingUser.id, {
            user_metadata: { name: account.name, role: account.role },
          });
        }
      } else {
        // User doesn't exist — create with metadata + email confirmed
        await adminClient.auth.admin.createUser({
          email: account.email,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { name: account.name, role: account.role },
        });
      }
    }

    // ── Now sign in with the anon client (cookies get written properly) ──
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

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: account.email,
        password: DEMO_PASSWORD,
      });

    if (signInData?.session) {
      return NextResponse.json({
        session: signInData.session,
        role: account.role,
        redirect: getRedirectPath(account.role),
      });
    }

    // ── Fallback: try sign-up (for when service role key is not available) ──
    if (!serviceRoleKey) {
      const { data: signUpData } = await supabase.auth.signUp({
        email: account.email,
        password: DEMO_PASSWORD,
        options: {
          data: { name: account.name, role: account.role },
        },
      });

      if (signUpData?.user) {
        const { data: loginData } = await supabase.auth.signInWithPassword({
          email: account.email,
          password: DEMO_PASSWORD,
        });

        if (loginData?.session) {
          return NextResponse.json({
            session: loginData.session,
            role: account.role,
            redirect: getRedirectPath(account.role),
          });
        }

        return NextResponse.json({
          requiresConfirmation: true,
          email: account.email,
          message:
            "Account created! Check your email to confirm, then try again.",
        });
      }
    }

    return NextResponse.json(
      { error: signInError?.message || "Login failed" },
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
