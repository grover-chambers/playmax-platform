export async function uploadToCloudinary(file: File): Promise<{ url: string; public_id: string } | null> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "marketlink_documents");
  formData.append("folder", "marketlink/documents");

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
      { method: "POST", body: formData },
    );
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return { url: data.secure_url, public_id: data.public_id };
  } catch {
    console.error("Cloudinary upload error");
    return null;
  }
}

/**
 * Delete a Cloudinary asset for a stored document.
 * Pass the document row id — the server loads the row, verifies the caller
 * is allowed to see it, and destroys only the public_id stored on that row.
 * A raw public_id must never be sent to the delete endpoint.
 */
export async function deleteFromCloudinary(documentId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/documents/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: documentId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
