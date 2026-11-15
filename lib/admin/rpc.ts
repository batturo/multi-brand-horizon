import "server-only";
import { backendMode, localDb } from "@/lib/backend";
import { AdminError, requireAdmin } from "@/lib/admin/session";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Call an admin database function as the logged-in admin. Row level
 * security and the function's own admin check both apply.
 */
export async function adminRpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  await requireAdmin();
  if (backendMode() === "local") {
    const { callRpc, LOCAL_ADMIN_ID } = await import("@/lib/local-db/create");
    try {
      return await callRpc<T>(await localDb(), { role: "authenticated", userId: LOCAL_ADMIN_ID }, fn, args);
    } catch (e) {
      const err = e as { message: string; code?: string };
      throw new AdminError(err.message, err.code);
    }
  }
  const db = await createSessionClient();
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new AdminError(error.message, error.code);
  return data as T;
}

/** Turn a database error into plain words for the admin screen. */
export function adminErrorMessage(e: unknown): string {
  const err = e as { message?: string; code?: string };
  const m = err?.message ?? "";
  if (err?.code === "42501") return "Please log in as an admin.";
  if (/products_price_check|price <= mrp/.test(m)) return "Price cannot be more than MRP.";
  if (/variants_stock_check/.test(m)) return "Stock cannot be below 0.";
  if (/variants_product_id_size_colour_key|duplicate key/.test(m)) return "The same size and colour is listed twice.";
  if (/Not enough stock|Cannot change order|Add at least one size|0 or more|not found/i.test(m)) return m;
  console.error("admin error:", err?.code, m);
  return "Something went wrong. Please try again.";
}
