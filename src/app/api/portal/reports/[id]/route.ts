import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getPortalClient(supabase, currentUser.id);
    if (!client) return NextResponse.json({ error: "No client account linked" }, { status: 404 });

    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!svcKey) return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, svcKey);

    const { data: del, error } = await admin
      .from("deliverables")
      .select("id, title, pdf_base64, client_id")
      .eq("id", id)
      .single();

    if (error || !del) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (del.client_id !== client.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!del.pdf_base64) {
      return NextResponse.json({ error: "PDF data not available" }, { status: 404 });
    }

    const pdfBuffer = Buffer.from(del.pdf_base64, "base64");
    const filename = `${del.title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to serve report" }, { status: 500 });
  }
}
