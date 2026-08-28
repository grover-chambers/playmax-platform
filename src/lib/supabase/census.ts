import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

const url = () => process.env.CENSUS_SUPABASE_URL!;
const anonKey = () => process.env.CENSUS_SUPABASE_ANON_KEY!;

let cachedToken: string | null = null;
let cachedAt = 0;
let tokenPromise: Promise<string> | null = null;

const TOKEN_TTL_MS = 50 * 60 * 1000;

async function fetchAccessToken(): Promise<string> {
  const res = await fetch(`${url()}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: process.env.CENSUS_PORTAL_EMAIL!,
      password: process.env.CENSUS_PORTAL_PASSWORD!,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `NiceOS census login failed (${res.status}): ${body.slice(0, 200)}`,
    );
  }

  const { access_token } = await res.json();
  if (!access_token) throw new Error("NiceOS census login returned no access token");
  return access_token as string;
}

function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() - cachedAt < TOKEN_TTL_MS) {
    return Promise.resolve(cachedToken);
  }
  tokenPromise ||= (async () => {
    try {
      cachedToken = await fetchAccessToken();
      cachedAt = Date.now();
      return cachedToken;
    } finally {
      tokenPromise = null;
    }
  })();
  return tokenPromise;
}

export async function createCensusClient(): Promise<SupabaseClient> {
  const token = await getAccessToken();
  return createSupabaseClient(url(), anonKey(), {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}