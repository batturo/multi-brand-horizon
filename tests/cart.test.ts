import { describe, expect, it } from "vitest";
import {
  EMPTY_CART,
  addToCart,
  cartCount,
  cartSubtotal,
  parseCart,
  reconcileCart,
  removeFromCart,
  setQuantity,
  type CartLine,
  type FreshVariant,
} from "@/lib/cart/cart";

const line: Omit<CartLine, "quantity"> = {
  variantId: "v1", productId: "p1", slug: "tee", title: "Tee", brand: "B", size: "M", colour: "",
  price: 449, mrp: 999, image: null, stock: 3,
};

const fresh = (patch: Partial<FreshVariant> = {}): FreshVariant => ({
  variantId: "v1", available: true, price: 449, mrp: 999, stock: 3, title: "Tee", brand: "B",
  size: "M", colour: "", slug: "tee", image: null, ...patch,
});

describe("cart", () => {
  it("adds, merges and caps at stock", () => {
    let c = addToCart(EMPTY_CART, line);
    c = addToCart(c, line, 5);
    expect(c.lines).toHaveLength(1);
    expect(c.lines[0].quantity).toBe(3);
    expect(cartCount(c)).toBe(3);
    expect(cartSubtotal(c)).toBe(1347);
  });
  it("does not add an out of stock variant", () => {
    expect(addToCart(EMPTY_CART, { ...line, stock: 0 }).lines).toHaveLength(0);
  });
  it("changes quantity and removes at zero", () => {
    const c = addToCart(EMPTY_CART, line, 2);
    expect(setQuantity(c, "v1", 1).lines[0].quantity).toBe(1);
    expect(setQuantity(c, "v1", 0).lines).toHaveLength(0);
    expect(removeFromCart(c, "v1").lines).toHaveLength(0);
  });
  it("survives bad stored data", () => {
    expect(parseCart("not json")).toEqual(EMPTY_CART);
    expect(parseCart(JSON.stringify({ lines: [{ variantId: 1 }] }))).toEqual(EMPTY_CART);
    const ok = JSON.stringify(addToCart(EMPTY_CART, line));
    expect(parseCart(ok).lines).toHaveLength(1);
  });
});

describe("reconcileCart", () => {
  const cart = addToCart(EMPTY_CART, line, 3);

  it("keeps an unchanged line without notices", () => {
    const r = reconcileCart(cart, [fresh()]);
    expect(r.notices).toEqual([]);
    expect(r.cart.lines[0].quantity).toBe(3);
  });
  it("lowers quantity to real stock", () => {
    const r = reconcileCart(cart, [fresh({ stock: 1 })]);
    expect(r.cart.lines[0].quantity).toBe(1);
    expect(r.notices[0].message).toMatch(/only 1 left/);
  });
  it("removes sold out and unavailable lines", () => {
    expect(reconcileCart(cart, [fresh({ stock: 0 })]).cart.lines).toHaveLength(0);
    const gone = reconcileCart(cart, []);
    expect(gone.cart.lines).toHaveLength(0);
    expect(gone.notices[0].message).toMatch(/no longer available/);
  });
  it("updates price and says so", () => {
    const r = reconcileCart(cart, [fresh({ price: 399 })]);
    expect(r.cart.lines[0].price).toBe(399);
    expect(r.notices[0].message).toBe("price changed from ₹449 to ₹399.");
  });
});
