import type { Metadata } from "next";
import Link from "next/link";
import { store } from "@/config/store";
import { ContactLine, TextPage } from "@/components/text-page";
import { CONDITIONS, conditionLabel, conditionNote } from "@/lib/catalog/conditions";

export const metadata: Metadata = {
  title: "About us",
  description: "Multi Brand Horizon is a shop in Naya Nangal, Punjab selling open-box and surplus branded apparel, footwear and accessories.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <TextPage>
      <h1>About {store.name}</h1>
      <p>
        {store.name} is a shop in Naya Nangal, Punjab. We sell open-box and surplus branded apparel, footwear and
        accessories. {store.tagline}.
      </p>

      <h2>How we show prices</h2>
      <ul>
        <li>Every item shows the MRP, our price and the percent off.</li>
        <li>Prices include taxes.</li>
        <li>The stock shown on the site is the real stock we have.</li>
      </ul>

      <h2>Condition of items</h2>
      <p>Every item is marked with one of these:</p>
      <dl>
        {CONDITIONS.map((c) => (
          <div key={c} className="mt-2">
            <dt className="font-semibold">{conditionLabel(c)}</dt>
            {conditionNote(c) && <dd>{conditionNote(c)}</dd>}
          </div>
        ))}
      </dl>
      <p>If you want to know more about an item&apos;s condition, ask us before you buy.</p>

      <h2>Brands</h2>
      <p>Brand names on this site describe the items we sell. They belong to their owners.</p>

      <h2>Visit or contact us</h2>
      <p>
        See <Link href="/visit">how to find the store</Link>. <ContactLine />
      </p>
    </TextPage>
  );
}
