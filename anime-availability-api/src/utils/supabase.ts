import { createClient } from "@supabase/supabase-js";
import { ENV } from "../config/env.js";

let _adminClient: ReturnType<typeof createClient> | null = null;

/**
 * Create a Supabase admin client using the service_role key.
 * Bypasses RLS so we can read all user_anime scores for community ratings.
 * Server-side only — never import this in client code.
 */
export function createSupabaseAdmin() {
  if (_adminClient) return _adminClient;

  if (!ENV.SUPABASE_URL || !ENV.SUPABASE_SERVICE_KEY) {
    throw new Error(
      "Missing Supabase admin credentials. Check SUPABASE_URL and SUPABASE_SERVICE_KEY.",
    );
  }

  _adminClient = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}
