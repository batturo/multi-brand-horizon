"use server";

import { getCatalog, isDemoCatalog } from "@/lib/catalog/data";
import { submitOrder, type PlaceOrderRpc, type SubmitResult } from "@/lib/orders/place";
import type { CheckoutInput } from "@/lib/orders/validate";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * Save an order as pending. The database re-prices everything from its own
 * data; the browser only says which variants and how many.
 */
export async function placeOrderAction(input: CheckoutInput, items: unknown): Promise<SubmitResult> {
  const safeInput: CheckoutInput = {
    name: String(input?.name ?? "").slice(0, 200),
    phone: String(input?.phone ?? "").slice(0, 40),
    address: String(input?.address ?? "").slice(0, 1000),
    pincode: String(input?.pincode ?? "").slice(0, 20),
    payment: String(input?.payment ?? ""),
  };

  if (isDemoCatalog()) return submitOrder(safeInput, items, previewRpc);

  const db = createPublicClient();
  if (!db) return { ok: false, formError: "Online ordering is not set up yet. Please call us to order." };
  const rpc: PlaceOrderRpc = async (args) => {
    const { data, error } = await db.rpc("place_order", args);
    return { data, error: error ? { message: error.message, code: error.code } : null };
  };
  return submitOrder(safeInput, items, rpc);
}

/**
 * Preview mode only (no database): price the order from the sample
 * catalogue so the flow can be reviewed. Nothing is saved.
 */
const previewRpc: PlaceOrderRpc = async (args) => {
  const { products, settings } = await getCatalog();
  const items = [];
  let subtotal = 0;
  for (const req of args.p_items) {
    const p = products.find((x) => x.variants.some((v) => v.id === req.variant_id));
    const v = p?.variants.find((x) => x.id === req.variant_id);
    if (!p || !v) return { data: null, error: { message: "Item is no longer available", code: "P0002" } };
    if (v.stock < req.quantity) {
      return { data: null, error: { message: `Only ${v.stock} left of ${p.title} ${v.size}`, code: "P0001" } };
    }
    items.push({
      title: p.title, brand: p.brand, size: v.size, colour: v.colour, quantity: req.quantity,
      unit_price: p.price, line_total: p.price * req.quantity,
    });
    subtotal += p.price * req.quantity;
  }
  const fee = settings.delivery_fee;
  return {
    data: {
      order_number: "PREVIEW-NOT-SAVED",
      items, subtotal, delivery_fee: fee, total: subtotal + (fee ?? 0),
      customer_name: args.p_customer_name, phone: args.p_phone, address: args.p_address,
      pincode: args.p_pincode, payment_preference: args.p_payment_preference,
    },
    error: null,
  };
};
