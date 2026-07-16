import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { public_id } = await request.json();
    if (!public_id) {
      return NextResponse.json({ error: "public_id is required" }, { status: 400 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName) {
      return NextResponse.json({ error: "Cloudinary cloud name not configured" }, { status: 500 });
    }

    if (apiKey && apiSecret) {
      const timestamp = Math.round(Date.now() / 1000);
      const signature = crypto.createHash("sha256")
        .update(`public_id=${public_id}&timestamp=${timestamp}${apiSecret}`)
        .digest("hex");

      const formData = new URLSearchParams();
      formData.append("public_id", public_id);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
        { method: "POST", body: formData },
      );

      if (!res.ok) {
        return NextResponse.json({ error: "Failed to delete from Cloudinary" }, { status: 502 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
