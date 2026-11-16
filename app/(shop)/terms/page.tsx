import type { Metadata } from "next";
import Link from "next/link";
import { store } from "@/config/store";
import { ContactLine, DraftNotice, TextPage } from "@/components/text-page";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for ordering from Multi Brand Horizon, Naya Nangal.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <TextPage>
      <h1>Terms</h1>
      <DraftNotice />
      <p>These terms apply when you order from {store.legalName ?? store.name} through this website.</p>

      <h2>Orders</h2>
      <ul>
        <li>Sending an order from this website is a request. Your order is confirmed only when we confirm it with you.</li>
        <li>
          Items are not held for you until we confirm. If two people ask for the last piece, we confirm the first
          request and tell the other.
        </li>
        <li>We may decline an order, for example if an item has sold in the shop.</li>
      </ul>

      <h2>Prices</h2>
      <ul>
        <li>Prices are in Indian rupees and include taxes.</li>
        <li>The price that applies is the one shown when you place your order.</li>
        <li>MRP is the maximum retail price printed by the brand or on the item.</li>
      </ul>

      <h2>Condition</h2>
      <p>
        Each item is marked New with tags, Open box like new, or Open box minor marks. Photos and descriptions show
        the item we have. Please ask us if you are unsure before ordering.
      </p>

      <h2>Payment</h2>
      <p>You can choose cash on delivery or UPI when you order.</p>

      <h2>Delivery and returns</h2>
      <p>
        See <Link href="/delivery">Delivery</Link> and <Link href="/returns">Returns and exchanges</Link>.
      </p>

      <h2>Brands</h2>
      <p>Brand names on this site describe the items we sell. They belong to their owners.</p>

      <h2>Contact</h2>
      <p>
        <ContactLine />
      </p>
    </TextPage>
  );
}
