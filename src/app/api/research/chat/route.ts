import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { buildResearchContext } from "@/lib/research-chat-context";
import { sanitizeError } from "@/lib/errors";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:1.5b";

const SYSTEM_PROMPT = `You are a senior market research analyst at PlayMax, an FMCG market intelligence platform. You have access to live analytics data from the platform's database. Answer questions concisely and insightfully based on the data provided in the context. If the data doesn't contain the answer, say so rather than making things up. Focus on actionable insights about market share, competitive positioning, category performance, branch distribution, supply chain gaps, and consumer behaviour. Keep responses under 300 words unless asked for detail. Use KES for currency.`;

export async function POST(req: NextRequest) {
  const rl = await rateLimit("research-chat", req, {
    windowSec: 60,
    maxRequests: 20,
  });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);

  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { project_id, messages, report_id } = await req.json();
    if (!project_id || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "project_id and messages array required" }, { status: 400 });
    }

    const { context } = await buildResearchContext(project_id, report_id || undefined);

    const userMsg = messages[messages.length - 1]?.content || "";

    const conversationHistory = messages.slice(-6, -1).map((m: { role: string; content: string }) =>
      `${m.role === "user" ? "User" : "Analyst"}: ${m.content}`
    ).join("\n");

    const prompt = `Context:\n${context}\n\n${conversationHistory ? `Previous conversation:\n${conversationHistory}\n\n` : ""}User question: ${userMsg}\n\nProvide a concise, data-driven answer:`;

    const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        system: SYSTEM_PROMPT,
        prompt,
        stream: false,
        options: { temperature: 0.3, num_predict: 2048 },
      }),
      signal: AbortSignal.timeout(55000),
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text().catch(() => "Ollama error");
      return NextResponse.json({ error: `LLM unavailable: ${errText}` }, { status: 503 });
    }

    const result = await ollamaRes.json();
    const reply = result.response || "I'm sorry, I couldn't generate a response.";

    return NextResponse.json({ reply, context_length: context.length });
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      return NextResponse.json({ error: "LLM request timed out. Try a simpler question." }, { status: 504 });
    }
    return NextResponse.json({ error: sanitizeError(e) }, { status: 500 });
  }
}
