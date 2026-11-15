import type { Metadata } from "next";
import { CheckoutForm } from "./checkout-form";
import { getCatalog } from "@/lib/catalog/data";
import { whatsappNumber } from "@/lib/store-info";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const { settings } = await getCatalog();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Checkout</h1>
      <CheckoutForm deliveryFee={settings.delivery_fee} whatsappNumber={whatsappNumber()} />
    </div>
  );
}
