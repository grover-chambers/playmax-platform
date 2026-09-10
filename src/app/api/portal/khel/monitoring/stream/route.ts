import { createCensusClient } from "@/lib/supabase/census";
import { getAuthenticatedClient, getCurrentUser, isStaff } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await getAuthenticatedClient();
  const user = await getCurrentUser(supabase);
  if (!user || !isStaff(user.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | null = null;
  let channel: ReturnType<Awaited<ReturnType<typeof createCensusClient>>["channel"]> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const census = await createCensusClient();

      const send = (table: string) => {
        try {
          controller.enqueue(encoder.encode(`event: change\ndata: ${JSON.stringify({ table, t: Date.now() })}\n\n`));
        } catch {}
      };

      channel = census
        .channel("war-room-live-server")
        .on("postgres_changes", { event: "*", schema: "public", table: "rep_locations" }, () => send("rep_locations"))
        .on("postgres_changes", { event: "*", schema: "public", table: "visits" }, () => send("visits"))
        .on("postgres_changes", { event: "*", schema: "public", table: "consumer_intercepts" }, () => send("consumer_intercepts"))
        .on("postgres_changes", { event: "*", schema: "public", table: "census_batches" }, () => send("census_batches"))
        .on("postgres_changes", { event: "*", schema: "public", table: "reps" }, () => send("reps"))
        .subscribe();

      // heartbeat + keepalive for proxies
      interval = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: keepalive\n\n`)); } catch {}
      }, 25000);

      // initial ping so client knows stream is live
      send("init");

      req.signal.addEventListener("abort", () => {
        if (interval) clearInterval(interval);
        try { if (channel) census.removeChannel(channel); } catch {}
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      if (interval) clearInterval(interval);
      try { if (channel) channel.unsubscribe(); } catch {}
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
