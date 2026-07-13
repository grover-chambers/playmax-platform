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

export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/documents/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_id: publicId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
