/**
 * Shop events, translated for GA4 (recommended ecommerce events) and the
 * Meta Pixel (standard events). Pure functions so the mapping is tested.
 */

export type TrackItem = {
  id: string; // product id
  name: string;
  brand: string;
  category?: string;
  variant?: string; // size / colour
  price: number;
  quantity: number;
};

export type ShopEvent =
  | { name: "view_item"; item: TrackItem }
  | { name: "add_to_cart"; item: TrackItem }
  | { name: "begin_checkout"; items: TrackItem[] }
  | { name: "whatsapp_order_click"; orderNumber: string; items: TrackItem[]; value: number; trigger: "auto" | "button" };

export type GaCall = { event: string; params: Record<string, unknown> };
export type MetaCall = { kind: "track" | "trackCustom"; event: string; params: Record<string, unknown> };

const gaItem = (i: TrackItem) => ({
  item_id: i.id,
  item_name: i.name,
  item_brand: i.brand,
  ...(i.category ? { item_category: i.category } : {}),
  ...(i.variant ? { item_variant: i.variant } : {}),
  price: i.price,
  quantity: i.quantity,
});

const value = (items: TrackItem[]) => items.reduce((n, i) => n + i.price * i.quantity, 0);

export function toGa(e: ShopEvent): GaCall {
  switch (e.name) {
    case "view_item":
    case "add_to_cart":
      return {
        event: e.name,
        params: { currency: "INR", value: e.item.price * e.item.quantity, items: [gaItem(e.item)] },
      };
    case "begin_checkout":
      return { event: "begin_checkout", params: { currency: "INR", value: value(e.items), items: e.items.map(gaItem) } };
    case "whatsapp_order_click":
      return {
        event: "whatsapp_order_click",
        params: {
          currency: "INR",
          value: e.value,
          transaction_id: e.orderNumber,
          trigger: e.trigger,
          items: e.items.map(gaItem),
        },
      };
  }
}

export function toMeta(e: ShopEvent): MetaCall {
  const base = (items: TrackItem[], v: number) => ({
    currency: "INR",
    value: v,
    content_type: "product",
    content_ids: [...new Set(items.map((i) => i.id))],
    contents: items.map((i) => ({ id: i.id, quantity: i.quantity, item_price: i.price })),
    num_items: items.reduce((n, i) => n + i.quantity, 0),
  });
  switch (e.name) {
    case "view_item":
      return { kind: "track", event: "ViewContent", params: { ...base([e.item], e.item.price), content_name: e.item.name } };
    case "add_to_cart":
      return { kind: "track", event: "AddToCart", params: { ...base([e.item], e.item.price * e.item.quantity), content_name: e.item.name } };
    case "begin_checkout":
      return { kind: "track", event: "InitiateCheckout", params: base(e.items, value(e.items)) };
    case "whatsapp_order_click":
      // Not a payment, so not "Purchase": a custom event with the order value.
      return {
        kind: "trackCustom",
        event: "WhatsAppOrderClick",
        params: { ...base(e.items, e.value), order_number: e.orderNumber, trigger: e.trigger },
      };
  }
}
