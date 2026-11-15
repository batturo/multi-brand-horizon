import Link from "next/link";
import { store } from "@/config/store";
import { formatINR } from "@/lib/pricing";

/** Short delivery and exchange note for product pages. Only confirmed facts. */
export function DeliverySummary({ deliveryFee }: { deliveryFee: number | null }) {
  return (
    <section aria-labelledby="delivery-summary" className="rounded border border-line p-4 text-sm leading-6">
      <h2 id="delivery-summary" className="font-semibold">
        Delivery and exchange
      </h2>
      <ul className="mt-1 list-disc pl-5">
        <li>
          {store.deliveryAreas ? `We deliver to ${store.deliveryAreas}.` : "Ask us if we deliver to your area."}{" "}
          {deliveryFee === null
            ? "Delivery fee confirmed on WhatsApp."
            : deliveryFee === 0
              ? "Free delivery."
              : `Delivery fee ${formatINR(deliveryFee)}.`}{" "}
          <Link href="/delivery" className="underline underline-offset-4">
            Delivery details
          </Link>
        </li>
        <li>
          {store.returnsPolicy ?? "Ask us about exchanges before you order."}{" "}
          <Link href="/returns" className="underline underline-offset-4">
            Returns and exchanges
          </Link>
        </li>
        <li>You can also buy in person at the shop in Naya Nangal.</li>
      </ul>
    </section>
  );
}
