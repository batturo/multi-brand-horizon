import type { Metadata } from "next";
import { CartView } from "./cart-view";
import { getCatalog } from "@/lib/catalog/data";

export const metadata: Metadata = {
  title: "Your cart",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const { settings } = await getCatalog();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Your cart</h1>
      <CartView deliveryFee={settings.delivery_fee} />
    </div>
  );
}
