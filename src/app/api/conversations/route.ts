import { NextResponse } from "next/server";

const conversations = [
  {
    id: "conv-1",
    contactName: "Twiga Foods",
    contactInitials: "TF",
    channel: "whatsapp",
    preview: "Looks great — send over the brand identity deck when ready",
    time: "2m ago",
    unread: 2,
    projectName: "Brand Identity Refresh",
    pipelineValue: "KES 450,000",
    status: "open",
  },
  {
    id: "conv-2",
    contactName: "Bidco Africa",
    contactInitials: "BA",
    channel: "email",
    preview: "Can we get a quote for the Mombasa Rd billboard?",
    time: "18m ago",
    unread: 1,
    projectName: "Billboard Inquiry",
    pipelineValue: "KES 120,000",
    status: "open",
  },
  {
    id: "conv-3",
    contactName: "Naivas",
    contactInitials: "NV",
    channel: "whatsapp",
    preview: "The research report is exactly what we needed. Thanks!",
    time: "1h ago",
    unread: 0,
    projectName: "Market Research Report",
    pipelineValue: "KES 280,000",
    status: "open",
  },
  {
    id: "conv-4",
    contactName: "P&G East Africa",
    contactInitials: "PG",
    channel: "whatsapp",
    preview: "We'd like to expand the scope to include digital screens",
    time: "3h ago",
    unread: 3,
    projectName: "Campaign Expansion",
    pipelineValue: "KES 890,000",
    status: "open",
  },
  {
    id: "conv-5",
    contactName: "Java House",
    contactInitials: "JH",
    channel: "email",
    preview: "Please review the attached proposal for Q3 campaign",
    time: "5h ago",
    unread: 0,
    projectName: "Q3 Campaign Proposal",
    pipelineValue: "KES 320,000",
    status: "open",
  },
  {
    id: "conv-6",
    contactName: "Unga Group",
    contactInitials: "UG",
    channel: "whatsapp",
    preview: "Hi, we're interested in your media placement services",
    time: "8h ago",
    unread: 1,
    projectName: "New Lead",
    pipelineValue: "KES 150,000",
    status: "open",
    autoReply: true,
  },
];

export async function GET() {
  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contactName, channel, preview, projectName, pipelineValue } = body;

    if (!contactName || !channel || !preview) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newConv = {
      id: `conv-${Date.now()}`,
      contactName,
      contactInitials: contactName
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      channel,
      preview,
      time: "now",
      unread: 1,
      projectName: projectName || null,
      pipelineValue: pipelineValue || null,
      status: "open",
    };

    return NextResponse.json({ conversation: newConv }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
