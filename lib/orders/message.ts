import { sizeText } from "@/lib/catalog/model";
import { formatINR } from "@/lib/pricing";
import { PAYMENT_LABELS, type PaymentPreference } from "@/lib/orders/validate";

export type PlacedOrder = {
  order_number: string;
  items: {
    product_id?: string;
    title: string;
    brand: string;
    size: string;
    colour: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
  subtotal: number;
  delivery_fee: number | null;
  total: number;
  customer_name: string;
  phone: string;
  address: string;
  pincode: string;
  payment_preference: PaymentPreference;
};

/** Multi-line address on one line: "House 1,\nStreet" -> "House 1, Street". */
export function flattenAddress(address: string): string {
  return address
    .split(/\n+/)
    .map((l) => l.trim().replace(/,+$/, ""))
    .filter(Boolean)
    .join(", ");
}

/** The WhatsApp message a customer sends to the shop after ordering. */
export function orderWhatsappMessage(o: PlacedOrder): string {
  const lines: string[] = [`New order ${o.order_number}`, ""];
  o.items.forEach((it, i) => {
    const variant = [sizeText(it.size), it.colour].filter(Boolean).join(", ");
    lines.push(`${i + 1}. ${it.title} (${it.brand})`);
    lines.push(
      `   ${variant ? `${variant}. ` : ""}Qty ${it.quantity} x ${formatINR(it.unit_price)} = ${formatINR(it.line_total)}`,
    );
  });
  lines.push(
    "",
    `Items: ${formatINR(o.subtotal)}`,
    `Delivery: ${o.delivery_fee === null ? "to be confirmed" : o.delivery_fee === 0 ? "free" : formatINR(o.delivery_fee)}`,
    `Total: ${formatINR(o.total)}${o.delivery_fee === null ? " + delivery" : ""}`,
    "",
    `Name: ${o.customer_name}`,
    `Phone: ${o.phone}`,
    `Address: ${flattenAddress(o.address)}`,
    `PIN code: ${o.pincode}`,
    `Payment: ${PAYMENT_LABELS[o.payment_preference]}`,
    "",
    "Please confirm my order.",
  );
  return lines.join("\n");
}
