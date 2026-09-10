import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    // Also allow Vercel cron (no auth header but header x-vercel-cron)
    if (!req.headers.get("x-vercel-cron")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Stub: no matview yet. Just confirms the cron path is wired. Revalidation happens via realtime + 30s poll.
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
