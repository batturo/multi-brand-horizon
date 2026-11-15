"use server";

import { backendMode, localDb } from "@/lib/backend";
import { submitOrder, type PlaceOrderRpc, type SubmitResult } from "@/lib/orders/place";
import type { CheckoutInput } from "@/lib/orders/validate";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * Save an order as pending. The database re-prices everything from its own
 * data; the browser only says which variants and how many.
 */
export async function placeOrderAction(
  input: CheckoutInput,
  items: unknown,
): Promise<SubmitResult & { preview?: boolean }> {
  const safeInput: CheckoutInput = {
    name: String(input?.name ?? "").slice(0, 200),
    phone: String(input?.phone ?? "").slice(0, 40),
    address: String(input?.address ?? "").slice(0, 1000),
    pincode: String(input?.pincode ?? "").slice(0, 20),
    payment: String(input?.payment ?? ""),
  };

  const mode = backendMode();
  if (mode === "local") {
    const { callRpc } = await import("@/lib/local-db/create");
    const db = await localDb();
    const rpc: PlaceOrderRpc = async (args) => {
      try {
        return { data: await callRpc(db, { role: "anon" }, "place_order", args), error: null };
      } catch (e) {
        const err = e as { message: string; code?: string };
        return { data: null, error: { message: err.message, code: err.code } };
      }
    };
    return { ...(await submitOrder(safeInput, items, rpc)), preview: true };
  }

  const db = createPublicClient();
  if (!db) return { ok: false, formError: "Online ordering is not set up yet. Please call us to order." };
  const rpc: PlaceOrderRpc = async (args) => {
    const { data, error } = await db.rpc("place_order", args);
    return { data, error: error ? { message: error.message, code: error.code } : null };
  };
  return submitOrder(safeInput, items, rpc);
}
