import { NextResponse } from "next/server";

const messagesStore: Record<string, Array<{
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  text: string;
  time: string;
  channel: "whatsapp" | "email";
  senderName: string;
  isAutomation?: boolean;
}>> = {
  "conv-1": [
    { id: "m1", conversationId: "conv-1", direction: "inbound", text: "Hi, we need a brand identity refresh for our new product line launching in Q3.", time: "10:12 AM", channel: "whatsapp", senderName: "Twiga Foods" },
    { id: "m2", conversationId: "conv-1", direction: "outbound", text: "Absolutely! We can put together a full brand identity package — logo, colour system, typography, and brand guidelines.", time: "10:15 AM", channel: "whatsapp", senderName: "Brian Mwangi" },
    { id: "m3", conversationId: "conv-1", direction: "inbound", text: "That sounds perfect. When can we expect the first round of concepts?", time: "10:20 AM", channel: "whatsapp", senderName: "Twiga Foods" },
    { id: "m4", conversationId: "conv-1", direction: "outbound", text: "We typically deliver first concepts within 7 business days. I'll draft the SOW and share it by EOD.", time: "10:22 AM", channel: "whatsapp", senderName: "Brian Mwangi" },
    { id: "m5", conversationId: "conv-1", direction: "inbound", text: "Looks great — send over the brand identity deck when ready", time: "10:30 AM", channel: "whatsapp", senderName: "Twiga Foods" },
  ],
  "conv-6": [
    { id: "m16", conversationId: "conv-6", direction: "inbound", text: "Hi, we're interested in your media placement services", time: "4:00 AM", channel: "whatsapp", senderName: "Unga Group" },
    { id: "m17", conversationId: "conv-6", direction: "outbound", text: "Thank you for reaching out! We've received your message and our team will get back to you within 2 hours.", time: "4:01 AM", channel: "whatsapp", senderName: "PlayMax", isAutomation: true },
  ],
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");

  if (!conversationId) {
    return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
  }

  const messages = messagesStore[conversationId] || [];
  return NextResponse.json({ messages });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationId, direction, text, channel, senderName, isAutomation } = body;

    if (!conversationId || !text || !channel) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newMessage = {
      id: `m-${Date.now()}`,
      conversationId,
      direction: direction || "outbound",
      text,
      time: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      channel,
      senderName: senderName || "Brian Mwangi",
      isAutomation: isAutomation || false,
    };

    if (!messagesStore[conversationId]) {
      messagesStore[conversationId] = [];
    }
    messagesStore[conversationId].push(newMessage);

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
