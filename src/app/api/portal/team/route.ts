import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getAdminClient } from "@/lib/supabase/admin";
import { requirePortalClient } from "@/lib/portal-guard";
import { canInviteMember, teamCapForTier } from "@/lib/team";
import { sendEmail } from "@/lib/email";
import { TeamInviteEmail } from "@/emails/team-invite";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["super_admin", "crm_admin", "cms_admin", "crm_staff", "finance"];

function tempPassword(): string {
  return randomBytes(9).toString("base64url");
}

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    const portal = await requirePortalClient(supabase, currentUser);
    if (portal.response) return portal.response;
    const client = portal.client;

    // Only the client admin manages the team.
    if (client.portal_role !== "admin") {
      return NextResponse.json(
        { error: "Only the account admin can view the team" },
        { status: 403 },
      );
    }

    const { data: members, error } = await supabase
      .from("client_users")
      .select("id, user_id, portal_role, created_at")
      .eq("client_id", client.id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Resolve auth details (email / name / last sign-in) for each member.
    const admin = getAdminClient();
    const rows = (members ?? []) as {
      user_id: string;
      portal_role: string;
      created_at: string;
    }[];

    // The account owner is always an admin member, even without a
    // client_users row (legacy 1:1 accounts). Include them once.
    const seen = new Set(rows.map((r) => r.user_id));
    if (client.user_id && !seen.has(client.user_id)) {
      rows.unshift({
        user_id: client.user_id,
        portal_role: "admin",
        created_at: client.created_at,
      });
    }

    const users = await Promise.all(
      rows.map(async (m) => {
        const { data: au } = await admin.auth.admin.getUserById(m.user_id);
        const u = au?.user;
        const owner = client.user_id === m.user_id;
        return {
          user_id: m.user_id,
          email: u?.email ?? null,
          name: u?.user_metadata?.name ?? null,
          portal_role: owner ? "admin" : m.portal_role,
          is_owner: owner,
          created_at: m.created_at,
          last_sign_in_at: u?.last_sign_in_at ?? null,
        };
      }),
    );

    return NextResponse.json({
      data: users,
      capacity: { limit: teamCapForTier(client.subscription_tier), used: users.length },
    });
  } catch (err) {
    console.error("[portal/team] GET error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    const portal = await requirePortalClient(supabase, currentUser);
    if (portal.response) return portal.response;
    const client = portal.client;

    if (client.portal_role !== "admin") {
      return NextResponse.json(
        { error: "Only the account admin can invite team members" },
        { status: 403 },
      );
    }

    const { email, name } = await request.json();

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    const normalizedEmail = email.trim().toLowerCase();

    // Tier-cap enforcement (server-side, never trusted from the UI).
    const { data: existing } = await supabase
      .from("client_users")
      .select("user_id")
      .eq("client_id", client.id);

    const currentCount = (existing ?? []).length;
    if (!canInviteMember(client.subscription_tier, currentCount)) {
      return NextResponse.json(
        {
          error: {
            code: "team_capacity_reached",
            message: `Your plan allows ${teamCapForTier(client.subscription_tier)} team ${
              teamCapForTier(client.subscription_tier) === 1 ? "member" : "members"
            }. Upgrade to add more.`,
          },
        },
        { status: 402 },
      );
    }

    // Already linked to this client? Checked below on insert (23505).

    const admin = getAdminClient();

    // Does the auth user already exist?
    const { data: users } = await admin.auth.admin.listUsers();
    const existingUser = users?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail,
    );

    let userId: string;
    let sentPassword: string | null = null;

    if (existingUser) {
      // A staff account must never be added to a client team.
      const role = existingUser.app_metadata?.role;
      if (role && STAFF_ROLES.includes(String(role))) {
        return NextResponse.json(
          { error: "That email belongs to a staff account and cannot be added" },
          { status: 409 },
        );
      }
      // Existing client/role-less user: ensure the client role and force a
      // password reset so the invitee proves ownership of the account.
      await admin.auth.admin.updateUserById(existingUser.id, {
        app_metadata: {
          ...(existingUser.app_metadata ?? {}),
          role: "client",
          must_change_password: true,
        },
      });
      userId = existingUser.id;
    } else {
      sentPassword = tempPassword();
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password: sentPassword,
        email_confirm: true,
        app_metadata: { role: "client", must_change_password: true },
        user_metadata: name ? { name: String(name).trim() } : {},
      });
      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }
      userId = created.user.id;
    }

    const { error: linkErr } = await supabase.from("client_users").insert({
      client_id: client.id,
      user_id: userId,
      portal_role: "viewer",
    });

    if (linkErr) {
      if (linkErr.code === "23505") {
        return NextResponse.json(
          { error: "That user is already part of your team" },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: linkErr.message }, { status: 500 });
    }

    // Email the invitee their temporary password (email-only handoff).
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const inviteeName = String(name?.trim() ?? "");
    await sendEmail({
      to: normalizedEmail,
      subject: `You've been added to ${client.company || client.name} on Market Link`,
      react: TeamInviteEmail({
        name: inviteeName,
        clientName: client.company || client.name || "your client",
        email: normalizedEmail,
        tempPassword: sentPassword ?? "Reset via 'Forgot password'",
        loginUrl: `${baseUrl}/login`,
      }),
    }).catch((e) => {
      console.error("[portal/team] invite email failed:", e instanceof Error ? e.message : e);
    });

    return NextResponse.json(
      { success: true, user_id: userId, password_sent: sentPassword !== null },
      { status: 201 },
    );
  } catch (err) {
    console.error("[portal/team] POST error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to invite team member" }, { status: 500 });
  }
}
