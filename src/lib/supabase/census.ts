import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Census Supabase client (isolated project zsprlozgdxzxeevvetmg).
 *
 * Auth: Resource Owner Password Grant via /auth/v1/token?grant_type=password
 * using CENSUS_PORTAL_EMAIL/PASSWORD + CENSUS_SUPABASE_ANON_KEY. The returned
 * access_token is cached in-memory for 50 minutes (TOKEN_TTL_MS) with
 * single-flight deduplication (tokenPromise) to avoid thundering herd.
 */
const url = () => {
  const u = process.env.CENSUS_SUPABASE_URL;
  if (!u) throw new Error("Missing CENSUS_SUPABASE_URL — set it in env (census project zsprlozgdxzxeevvetmg)");
  if (u === process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("Census isolation violated: CENSUS_SUPABASE_URL must not equal NEXT_PUBLIC_SUPABASE_URL");
  return u;
};
const anonKey = () => {
  const k = process.env.CENSUS_SUPABASE_ANON_KEY;
  if (!k) throw new Error("Missing CENSUS_SUPABASE_ANON_KEY — set it in env (census anon key for zsprlozgdxzxeevvetmg)");
  return k;
};

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
