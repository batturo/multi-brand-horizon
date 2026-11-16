import { createClient } from "@supabase/supabase-js";

/**
 * Secret-key client that bypasses row level security. Only for trusted
 * scripts run by the shop owner (e.g. sample data). Never import this from
 * app code that runs for visitors.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
