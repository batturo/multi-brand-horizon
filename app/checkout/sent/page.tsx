import type { Metadata } from "next";
import { OrderSent } from "@/app/checkout/sent/order-sent";
import { store } from "@/config/store";
import { formatPhone } from "@/lib/store-info";

export const metadata: Metadata = {
  title: "Order received",
  robots: { index: false, follow: false },
};

export default function OrderSentPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Order received</h1>
      <OrderSent phones={store.phones.map((p) => ({ href: `tel:${p}`, label: formatPhone(p) }))} />
    </div>
  );
}
