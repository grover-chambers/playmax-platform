import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
// Fail-closed: CRON_SECRET must be set, else 500. Accepts Bearer <secret> or
// x-vercel-cron header (Vercel Cron injects this only when Vercel env is configured).
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Misconfigured: CRON_SECRET not set" }, { status: 500 });
  if (auth !== `Bearer ${secret}` && !req.headers.get("x-vercel-cron")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Stub: no matview yet. Just confirms the cron path is wired. Revalidation happens via realtime + 30s poll.
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
