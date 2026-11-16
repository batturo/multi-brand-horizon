/**
 * Cart maths. The cart is kept in the visitor's browser. Prices shown in the
 * cart are refreshed from the server, and the order is priced again by the
 * database when it is placed, so nothing here is trusted for money.
 */

import { formatINR } from "@/lib/pricing";

export const MAX_PER_LINE = 10;

export type CartLine = {
  variantId: string;
  productId: string;
  slug: string;
  title: string;
  brand: string;
  size: string;
  colour: string;
  price: number;
  mrp: number;
  image: string | null;
  quantity: number;
  /** Stock when last seen, used to cap the quantity picker. */
  stock: number;
};

export type Cart = { lines: CartLine[] };

export const EMPTY_CART: Cart = { lines: [] };

const cap = (qty: number, stock: number) =>
  Math.max(0, Math.min(Math.floor(qty), MAX_PER_LINE, Math.max(0, stock)));

export function addToCart(cart: Cart, line: Omit<CartLine, "quantity">, quantity = 1): Cart {
  const existing = cart.lines.find((l) => l.variantId === line.variantId);
  if (existing) {
    return {
      lines: cart.lines.map((l) =>
        l.variantId === line.variantId
          ? { ...l, ...line, quantity: cap(l.quantity + quantity, line.stock) }
          : l,
      ),
    };
  }
  const q = cap(quantity, line.stock);
  if (q === 0) return cart;
  return { lines: [...cart.lines, { ...line, quantity: q }] };
}

export function setQuantity(cart: Cart, variantId: string, quantity: number): Cart {
  return {
    lines: cart.lines
      .map((l) => (l.variantId === variantId ? { ...l, quantity: cap(quantity, l.stock) } : l))
      .filter((l) => l.quantity > 0),
  };
}

export function removeFromCart(cart: Cart, variantId: string): Cart {
  return { lines: cart.lines.filter((l) => l.variantId !== variantId) };
}

export function cartCount(cart: Cart): number {
  return cart.lines.reduce((n, l) => n + l.quantity, 0);
}

export function cartSubtotal(cart: Cart): number {
  return cart.lines.reduce((n, l) => n + l.price * l.quantity, 0);
}

export type FreshVariant = {
  variantId: string;
  available: boolean;
  price: number;
  mrp: number;
  stock: number;
  title: string;
  brand: string;
  size: string;
  colour: string;
  slug: string;
  image: string | null;
};

export type CartNotice = { variantId: string; title: string; message: string };

/**
 * Bring the cart up to date with current prices and stock. Lines that are no
 * longer available or out of stock are removed; quantities above stock are
 * lowered. Returns what changed so the visitor can be told.
 */
export function reconcileCart(cart: Cart, fresh: FreshVariant[]): { cart: Cart; notices: CartNotice[] } {
  const byId = new Map(fresh.map((f) => [f.variantId, f]));
  const notices: CartNotice[] = [];
  const lines: CartLine[] = [];
  for (const l of cart.lines) {
    const f = byId.get(l.variantId);
    if (!f || !f.available) {
      notices.push({ variantId: l.variantId, title: l.title, message: "is no longer available and was removed." });
      continue;
    }
    if (f.stock <= 0) {
      notices.push({ variantId: l.variantId, title: l.title, message: "has sold out and was removed." });
      continue;
    }
    let quantity = l.quantity;
    if (quantity > f.stock) {
      quantity = f.stock;
      notices.push({
        variantId: l.variantId,
        title: l.title,
        message: `has only ${f.stock} left. Quantity changed to ${f.stock}.`,
      });
    }
    if (f.price !== l.price) {
      notices.push({
        variantId: l.variantId,
        title: l.title,
        message: `price changed from ${formatINR(l.price)} to ${formatINR(f.price)}.`,
      });
    }
    lines.push({
      ...l,
      price: f.price,
      mrp: f.mrp,
      stock: f.stock,
      title: f.title,
      brand: f.brand,
      size: f.size,
      colour: f.colour,
      slug: f.slug,
      image: f.image,
      quantity: Math.min(quantity, MAX_PER_LINE),
    });
  }
  return { cart: { lines }, notices };
}

/** Parse whatever is in storage; anything malformed is dropped. */
export function parseCart(raw: string | null): Cart {
  if (!raw) return EMPTY_CART;
  try {
    const data = JSON.parse(raw) as { lines?: unknown };
    if (!Array.isArray(data.lines)) return EMPTY_CART;
    const lines = data.lines.filter(
      (l): l is CartLine =>
        !!l &&
        typeof l === "object" &&
        typeof (l as CartLine).variantId === "string" &&
        typeof (l as CartLine).slug === "string" &&
        typeof (l as CartLine).title === "string" &&
        Number.isInteger((l as CartLine).quantity) &&
        (l as CartLine).quantity > 0 &&
        Number.isFinite((l as CartLine).price),
    );
    return { lines: lines.slice(0, 50) };
  } catch {
    return EMPTY_CART;
  }
}
