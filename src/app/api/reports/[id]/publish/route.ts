import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { sanitizeError } from "@/lib/errors";
import { generateSummaryReport } from "@/lib/pdf-reports";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdmin(currentUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const overrideTitle: string | undefined = body.title;
    const overrideContent: string | undefined = body.content;

    // 1. Load the report
    const { data: report, error: reportErr } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .single();

    if (reportErr || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // 2. If content override, persist it
    if (overrideContent !== undefined) {
      await supabase.from("reports").update({ content: overrideContent }).eq("id", id);
    }

    // Resolve client name for the PDF header
    let clientName: string | null = null;
    if (report.client_id) {
      const { data: cl } = await supabase
        .from("clients")
        .select("company, name")
        .eq("id", report.client_id)
        .single();
      clientName = cl?.company || cl?.name || null;
    }

    const finalTitle = overrideTitle || report.title;

    // 3. Decide whether to reuse the worker PDF or render a new one
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!svcKey) return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, svcKey);

    let finalUrl = report.storage_url;

    if (overrideContent !== undefined || report.kind !== "ai_summary" || !report.storage_url) {
      const contentText = overrideContent || report.content || "No summary available.";
      const pdfDoc = generateSummaryReport(finalTitle, clientName, contentText);
      const pdfBuffer = Buffer.from(pdfDoc.output("arraybuffer"));

      const filename = `published-${id}-${Date.now()}.pdf`;
      const bucket = process.env.STORAGE_BUCKET || "research-reports";

      const { error: uploadErr } = await admin.storage
        .from(bucket)
        .upload(filename, pdfBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadErr) return NextResponse.json({ error: sanitizeError(uploadErr) }, { status: 500 });

      finalUrl = admin.storage.from(bucket).getPublicUrl(filename).data.publicUrl;
    }

    // 4. Insert into documents
    const { data: doc, error: docErr } = await admin
      .from("documents")
      .insert({
        project_id: null,
        client_id: report.client_id,
        name: finalTitle,
        type: "pdf",
        url: finalUrl,
        visible_to_client: false,
        source_report_id: report.id,
      })
      .select()
      .single();

    if (docErr) return NextResponse.json({ error: sanitizeError(docErr) }, { status: 500 });

    return NextResponse.json({ data: doc });
  } catch (e) {
    return NextResponse.json({ error: sanitizeError(e) }, { status: 500 });
  }
}
