import type { Metadata } from "next";
import Link from "next/link";
import { store } from "@/config/store";
import { ContactLine, TextPage } from "@/components/text-page";
import { getCatalog } from "@/lib/catalog/data";
import { formatINR } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Delivery",
  description: "Where Multi Brand Horizon delivers, the delivery fee, and how ordering works.",
  alternates: { canonical: "/delivery" },
};

export default async function DeliveryPage() {
  const { settings } = await getCatalog();
  const fee = settings.delivery_fee;
  return (
    <TextPage>
      <h1>Delivery</h1>

      <h2>Where we deliver</h2>
      <p>{store.deliveryAreas ?? "We are confirming our delivery areas. Please ask us if we deliver to you."}</p>

      <h2>Delivery fee</h2>
      <p>
        {fee === null
          ? "We confirm the delivery fee with you on WhatsApp before your order is confirmed."
          : fee === 0
            ? "Delivery is free."
            : `The delivery fee is ${formatINR(fee)} per order. It is shown in your cart before you order.`}
      </p>

      {store.deliveryTime && (
        <>
          <h2>How long it takes</h2>
          <p>{store.deliveryTime}</p>
        </>
      )}

      <h2>How ordering works</h2>
      <ol>
        <li>Add items to your cart and send your order request.</li>
        <li>You get an order number, and WhatsApp opens with your order details for you to send to us.</li>
        <li>We check the items and reply on WhatsApp to confirm.</li>
        <li>Pay by cash on delivery or UPI, as you chose.</li>
      </ol>
      <p>
        Many items are single pieces. If two people ask for the last one, we confirm the first and tell the other.
        Your order is only confirmed when we reply.
      </p>

      <h2>Pick up from the shop</h2>
      <p>
        You can also buy in person. See <Link href="/visit">how to find the store</Link>.
      </p>

      <h2>Questions</h2>
      <p>
        <ContactLine />
      </p>
    </TextPage>
  );
}
