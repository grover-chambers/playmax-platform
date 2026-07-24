import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No CSV file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
    }

    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIdx = header.indexOf("name");
    const codeIdx = header.indexOf("code");
    const contactIdx = header.indexOf("contact_person");
    const phoneIdx = header.indexOf("phone");
    const emailIdx = header.indexOf("email");

    if (nameIdx === -1) {
      return NextResponse.json({ error: "CSV must contain a 'name' column" }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const name = cols[nameIdx]?.trim();
      if (!name) {
        skipped++;
        continue;
      }

      try {
        const { data: existing } = await supabase
          .from("analytics_suppliers")
          .select("id")
          .ilike("name", name)
          .limit(1);

        if (existing && existing.length > 0) {
          skipped++;
          continue;
        }

        const { error } = await supabase.from("analytics_suppliers").insert({
          name,
          code: codeIdx !== -1 ? cols[codeIdx] || null : null,
          contact_person: contactIdx !== -1 ? cols[contactIdx] || null : null,
          phone: phoneIdx !== -1 ? cols[phoneIdx] || null : null,
          email: emailIdx !== -1 ? cols[emailIdx] || null : null,
        });

        if (error) {
          errors.push(`Row ${i + 1}: ${error.message}`);
        } else {
          imported++;
        }
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({ imported, skipped, errors });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
