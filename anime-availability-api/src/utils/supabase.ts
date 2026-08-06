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

  // Name the missing variable specifically. The previous message listed both,
  // so a deployment that had one of them still pointed at the wrong thing —
  // and the usual cause is a naming mismatch, not an absent value.
  const missing: string[] = [];
  if (!ENV.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!ENV.SUPABASE_SERVICE_KEY) {
    missing.push("SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY)");
  }

  if (missing.length > 0) {
    throw new Error(`Missing Supabase admin credentials: ${missing.join(", ")}`);
  }

  _adminClient = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}
