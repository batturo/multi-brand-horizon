import { validateCheckout, type CheckoutInput, type FieldErrors } from "@/lib/orders/validate";
import type { PlacedOrder } from "@/lib/orders/message";

export type OrderItemRequest = { variant_id: string; quantity: number };

export type PlaceOrderRpc = (args: {
  p_items: OrderItemRequest[];
  p_customer_name: string;
  p_phone: string;
  p_address: string;
  p_pincode: string;
  p_payment_preference: "cod" | "upi";
}) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;

export type SubmitResult =
  | { ok: true; order: PlacedOrder }
  | { ok: false; fieldErrors?: FieldErrors; formError?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Clean up what the browser sent about the cart. Prices are never taken from it. */
export function cleanItems(raw: unknown): OrderItemRequest[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 50) return null;
  const merged = new Map<string, number>();
  for (const r of raw) {
    if (!r || typeof r !== "object") return null;
    const { variant_id, quantity } = r as Record<string, unknown>;
    if (typeof variant_id !== "string" || !UUID.test(variant_id)) return null;
    if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 10) return null;
    merged.set(variant_id.toLowerCase(), (merged.get(variant_id.toLowerCase()) ?? 0) + (quantity as number));
  }
  return [...merged].map(([variant_id, quantity]) => ({ variant_id, quantity }));
}

/** Turn a database error into something a customer can act on. */
export function friendlyOrderError(err: { message: string; code?: string }): string {
  const m = err.message ?? "";
  if (err.code === "P0001" && /^Only \d+ left/.test(m)) {
    return `${m}. Please go back to your cart and lower the quantity.`;
  }
  if (err.code === "P0002" || /no longer available/i.test(m)) {
    return "An item in your cart is no longer available. Please go back to your cart; it will update.";
  }
  if (/At most 10/.test(m)) return "You can order at most 10 of one item.";
  return "Sorry, we could not save your order. Please try again, or call us.";
}

export async function submitOrder(
  input: CheckoutInput,
  rawItems: unknown,
  rpc: PlaceOrderRpc,
): Promise<SubmitResult> {
  const checked = validateCheckout(input);
  if (!checked.ok) return { ok: false, fieldErrors: checked.errors };
  const items = cleanItems(rawItems);
  if (!items) return { ok: false, formError: "Your cart is empty or could not be read. Please go back to your cart." };

  const v = checked.values;
  const { data, error } = await rpc({
    p_items: items,
    p_customer_name: v.name,
    p_phone: v.phone,
    p_address: v.address,
    p_pincode: v.pincode,
    p_payment_preference: v.payment,
  });
  if (error) {
    if (!["P0001", "P0002"].includes(error.code ?? "")) console.error("place_order failed:", error.code, error.message);
    return { ok: false, formError: friendlyOrderError(error) };
  }
  const order = data as PlacedOrder | null;
  if (!order?.order_number) return { ok: false, formError: friendlyOrderError({ message: "" }) };
  return { ok: true, order };
}
