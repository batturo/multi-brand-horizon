/**
 * Price maths. All amounts are whole rupees and include taxes.
 */

export type PriceCheck = { ok: true } | { ok: false; error: string };

export function validatePrices(mrp: number, price: number): PriceCheck {
  if (!Number.isInteger(mrp) || !Number.isInteger(price)) {
    return { ok: false, error: "Prices must be whole rupees" };
  }
  if (mrp <= 0) return { ok: false, error: "MRP must be more than 0" };
  if (price <= 0) return { ok: false, error: "Price must be more than 0" };
  if (price > mrp) return { ok: false, error: "Price cannot be more than MRP" };
  return { ok: true };
}

/**
 * Percent off MRP, rounded down so we never overstate the discount.
 * Returns 0 when there is no real discount or the inputs are invalid.
 */
export function discountPercent(mrp: number, price: number): number {
  if (!(mrp > 0) || !(price > 0) || price >= mrp) return 0;
  return Math.floor(((mrp - price) / mrp) * 100);
}

/** Rupees saved against MRP (never negative). */
export function savings(mrp: number, price: number): number {
  return Math.max(0, mrp - price);
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** "₹1,23,456" */
export function formatINR(amount: number): string {
  return inr.format(amount);
}

export type CartLine = { unitPrice: number; quantity: number };

export function lineTotal(line: CartLine): number {
  return line.unitPrice * line.quantity;
}

export function orderTotals(lines: CartLine[], deliveryFee: number | null) {
  const subtotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  return {
    subtotal,
    deliveryFee,
    total: subtotal + (deliveryFee ?? 0),
  };
}
