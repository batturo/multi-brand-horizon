import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { backendMode } from "@/lib/backend";
import { createSessionClient } from "@/lib/supabase/server";

export type AdminSession =
  | { status: "admin"; email: string | null; preview: boolean }
  | { status: "not_admin"; email: string | null }
  | { status: "signed_out" }
  | { status: "unconfigured" };

/**
 * Who is using the admin. Reads the login cookie, so only call it from
 * dynamic code (inside Suspense, Server Actions). Cached per request.
 * In the local preview there is no login: you are the preview admin.
 */
export const getAdminSession = cache(async (): Promise<AdminSession> => {
  // Admin screens are always rendered per request, never prerendered.
  await connection();
  const mode = backendMode();
  if (mode === "local") return { status: "admin", email: "preview admin", preview: true };
  if (mode === "none") return { status: "unconfigured" };

  const db = await createSessionClient();
  const { data } = await db.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { status: "signed_out" };
  const email = typeof claims.email === "string" ? claims.email : null;
  const { data: isAdmin, error } = await db.rpc("is_admin");
  if (error || isAdmin !== true) return { status: "not_admin", email };
  return { status: "admin", email, preview: false };
});

export class AdminError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

/** For Server Actions: throws unless the caller is an admin. */
export async function requireAdmin(): Promise<void> {
  const s = await getAdminSession();
  if (s.status !== "admin") throw new AdminError("Please log in as an admin.", "42501");
}
