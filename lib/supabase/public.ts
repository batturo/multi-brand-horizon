import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

/**
 * Cookie-free client for public catalogue reads. Safe inside "use cache"
 * because it never touches the request. Row level security limits it to
 * published products in visible categories.
 * Returns null when Supabase is not configured (e.g. a build without env).
 */
export function createPublicClient(): SupabaseClient | null {
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
