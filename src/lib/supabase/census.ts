import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createCensusClient() {
  return createSupabaseClient(
    process.env.CENSUS_SUPABASE_URL!,
    process.env.CENSUS_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
