import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    // During prerender without env vars, return a stub that won't crash
    return createBrowserClient(
      "https://placeholder.supabase.co",
      "placeholder",
    );
  }
  return createBrowserClient(url, key);
}
