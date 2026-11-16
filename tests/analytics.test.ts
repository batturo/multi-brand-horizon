import { afterEach, describe, expect, it } from "vitest";
import { gaId, googleSiteVerification, metaPixelId } from "@/lib/analytics/config";
import { toGa, toMeta, type TrackItem } from "@/lib/analytics/events";

const tee: TrackItem = { id: "p1", name: "Crew Neck T-Shirt", brand: "Brand A", category: "Apparel", variant: "M / Black", price: 449, quantity: 2 };
const belt: TrackItem = { id: "p2", name: "Leather Belt", brand: "Brand C", price: 499, quantity: 1 };

describe("GA4 events", () => {
  it("view_item and add_to_cart use the GA4 ecommerce shape in INR", () => {
    expect(toGa({ name: "view_item", item: { ...tee, quantity: 1 } })).toEqual({
      event: "view_item",
      params: {
        currency: "INR",
        value: 449,
        items: [{ item_id: "p1", item_name: "Crew Neck T-Shirt", item_brand: "Brand A", item_category: "Apparel", item_variant: "M / Black", price: 449, quantity: 1 }],
      },
    });
    expect(toGa({ name: "add_to_cart", item: tee }).params.value).toBe(898);
  });

  it("begin_checkout totals the cart", () => {
    const g = toGa({ name: "begin_checkout", items: [tee, belt] });
    expect(g.event).toBe("begin_checkout");
    expect(g.params).toMatchObject({ currency: "INR", value: 898 + 499 });
    expect((g.params.items as unknown[]).length).toBe(2);
  });

  it("whatsapp_order_click carries the order number", () => {
    const g = toGa({ name: "whatsapp_order_click", orderNumber: "MBH-10042", items: [tee], value: 948, trigger: "auto" });
    expect(g).toMatchObject({ event: "whatsapp_order_click", params: { transaction_id: "MBH-10042", value: 948, trigger: "auto" } });
  });
});

describe("Meta Pixel events", () => {
  it("maps to standard events", () => {
    expect(toMeta({ name: "view_item", item: tee }).event).toBe("ViewContent");
    expect(toMeta({ name: "add_to_cart", item: tee })).toMatchObject({
      kind: "track",
      event: "AddToCart",
      params: { currency: "INR", value: 898, content_ids: ["p1"], content_type: "product", num_items: 2 },
    });
    expect(toMeta({ name: "begin_checkout", items: [tee, belt] })).toMatchObject({
      event: "InitiateCheckout",
      params: { value: 1397, content_ids: ["p1", "p2"], num_items: 3 },
    });
  });
  it("sends the WhatsApp order as a custom event, not a Purchase", () => {
    const m = toMeta({ name: "whatsapp_order_click", orderNumber: "MBH-1", items: [belt], value: 549, trigger: "button" });
    expect(m).toMatchObject({ kind: "trackCustom", event: "WhatsAppOrderClick", params: { value: 549, order_number: "MBH-1" } });
  });
});

describe("IDs from the environment", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });
  it("is off unless a valid ID is set", () => {
    delete process.env.NEXT_PUBLIC_GA_ID;
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    delete process.env.GOOGLE_SITE_VERIFICATION;
    expect([gaId(), metaPixelId(), googleSiteVerification()]).toEqual([null, null, null]);
    process.env.NEXT_PUBLIC_GA_ID = "UA-123"; // old Universal Analytics IDs are not GA4
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "abc";
    expect([gaId(), metaPixelId()]).toEqual([null, null]);
  });
  it("accepts real-looking IDs", () => {
    process.env.NEXT_PUBLIC_GA_ID = " G-ABC123XYZ ";
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "1234567890123456";
    process.env.GOOGLE_SITE_VERIFICATION = "AbCdEf1234567890_xyz-QW";
    expect([gaId(), metaPixelId(), googleSiteVerification()]).toEqual(["G-ABC123XYZ", "1234567890123456", "AbCdEf1234567890_xyz-QW"]);
  });
});
