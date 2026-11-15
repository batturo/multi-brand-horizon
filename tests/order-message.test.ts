import { describe, expect, it } from "vitest";
import { orderWhatsappMessage, type PlacedOrder } from "@/lib/orders/message";
import { whatsappLink } from "@/lib/whatsapp";

const order: PlacedOrder = {
  order_number: "MBH-10042",
  items: [
    { title: "Crew Neck T-Shirt", brand: "Brand A", size: "M", colour: "Black", quantity: 2, unit_price: 449, line_total: 898 },
    { title: "Leather Belt", brand: "Brand C", size: "", colour: "", quantity: 1, unit_price: 1499, line_total: 1499 },
  ],
  subtotal: 2397,
  delivery_fee: 50,
  total: 2447,
  customer_name: "Test Customer",
  phone: "9876543210",
  address: "House 1,\nTest Street\nNaya Nangal",
  pincode: "140126",
  payment_preference: "cod",
};

describe("orderWhatsappMessage", () => {
  it("includes order number, items, sizes, total and address", () => {
    expect(orderWhatsappMessage(order)).toBe(
      [
        "New order MBH-10042",
        "",
        "1. Crew Neck T-Shirt (Brand A)",
        "   Size M, Black. Qty 2 x ₹449 = ₹898",
        "2. Leather Belt (Brand C)",
        "   Qty 1 x ₹1,499 = ₹1,499",
        "",
        "Items: ₹2,397",
        "Delivery: ₹50",
        "Total: ₹2,447",
        "",
        "Name: Test Customer",
        "Phone: 9876543210",
        "Address: House 1, Test Street, Naya Nangal",
        "PIN code: 140126",
        "Payment: Cash on delivery",
        "",
        "Please confirm my order.",
      ].join("\n"),
    );
  });

  it("says when delivery is still to be confirmed", () => {
    const msg = orderWhatsappMessage({ ...order, delivery_fee: null, total: 2397, payment_preference: "upi" });
    expect(msg).toContain("Delivery: to be confirmed");
    expect(msg).toContain("Total: ₹2,397 + delivery");
    expect(msg).toContain("Payment: UPI");
  });

  it("says free delivery when the fee is zero", () => {
    expect(orderWhatsappMessage({ ...order, delivery_fee: 0, total: 2397 })).toContain("Delivery: free");
  });

  it("survives the round trip through a wa.me link", () => {
    const msg = orderWhatsappMessage(order);
    const url = new URL(whatsappLink("+919041636322", msg));
    expect(url.host).toBe("wa.me");
    expect(url.pathname).toBe("/919041636322");
    expect(url.searchParams.get("text")).toBe(msg);
  });
});

describe("one-size items", () => {
  it("does not say 'Size One size'", () => {
    const msg = orderWhatsappMessage({
      ...order,
      items: [{ title: "Watch", brand: "B", size: "One size", colour: "Silver", quantity: 1, unit_price: 100, line_total: 100 }],
    });
    expect(msg).toContain("   One size, Silver. Qty 1");
  });
});
