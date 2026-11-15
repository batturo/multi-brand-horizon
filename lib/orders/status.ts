/**
 * Order status rules. The database trigger `orders_apply_status_change` is
 * the source of truth; this mirrors it so the admin UI only offers valid
 * moves. Tests check that both agree.
 */

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "dispatched",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const NEXT: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["dispatched", "cancelled"],
  dispatched: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function allowedNextStatuses(from: OrderStatus): readonly OrderStatus[] {
  return NEXT[from];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT[from].includes(to);
}

/**
 * What happens to shelf stock when an order moves between statuses.
 * "take": subtract the ordered quantities. "return": add them back.
 */
export function stockEffect(
  from: OrderStatus,
  to: OrderStatus,
  stockApplied: boolean,
): "take" | "return" | "none" {
  if (!canTransition(from, to)) return "none";
  if (to === "confirmed" && !stockApplied) return "take";
  if (to === "cancelled" && stockApplied) return "return";
  return "none";
}
