import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env, publicEnv } from "@/env";
import type { Database } from "./database.types";

// Bypasses RLS by design. Only use for writes that must succeed regardless of the
// caller's role (e.g. the audit log) — never expose this client to user-supplied queries.
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
