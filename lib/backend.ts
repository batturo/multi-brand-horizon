import "server-only";
import type { PGlite } from "@electric-sql/pglite";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Where data lives:
 * - "supabase": the real database (always in production)
 * - "local": in-memory Postgres with the real migrations and the sample
 *   products, for previewing on a computer before Supabase is set up.
 *   Only when DEMO_CATALOG=samples, Supabase is not configured, and not on
 *   Vercel production. Data resets when the server restarts.
 * - "none": nothing configured; the shop shows as empty.
 */
export type BackendMode = "supabase" | "local" | "none";

export function backendMode(): BackendMode {
  if (isSupabaseConfigured()) return "supabase";
  if (process.env.DEMO_CATALOG === "samples" && process.env.VERCEL_ENV !== "production") return "local";
  return "none";
}

type G = typeof globalThis & { __mbhLocalDb?: Promise<PGlite> };

/** The shared local preview database (created on first use). */
export function localDb(): Promise<PGlite> {
  if (backendMode() !== "local") throw new Error("Local database is only for the preview mode");
  const g = globalThis as G;
  if (!g.__mbhLocalDb) {
    g.__mbhLocalDb = import("@/lib/local-db/create").then((m) =>
      m.createLocalDb(process.cwd(), { samples: true }),
    );
  }
  return g.__mbhLocalDb;
}
