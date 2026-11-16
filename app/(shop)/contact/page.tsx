import type { Metadata } from "next";
import { store } from "@/config/store";
import { StoreLocation } from "@/components/store-location";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contact",
  description: "Phone, WhatsApp and Instagram for Multi Brand Horizon, Naya Nangal.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <section className="bg-ink text-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold">Contact us</h1>
        <ul className="mt-4 flex flex-wrap gap-3">
          {store.whatsappNumber && (
            <li>
              <a
                href={whatsappLink(store.whatsappNumber, "Hi, I have a question.")}
                rel="noopener"
                target="_blank"
                className="inline-block rounded bg-gold px-4 py-2 font-semibold text-ink hover:bg-white"
              >
                Message on WhatsApp
              </a>
            </li>
          )}
          <li>
            <a
              href={store.instagramUrl}
              rel="noopener"
              className="inline-block rounded border border-gold px-4 py-2 font-semibold text-gold hover:bg-gold hover:text-ink"
            >
              Instagram
            </a>
          </li>
          {store.email && (
            <li>
              <a
                href={`mailto:${store.email}`}
                className="inline-block rounded border border-gold px-4 py-2 font-semibold text-gold hover:bg-gold hover:text-ink"
              >
                Email {store.email}
              </a>
            </li>
          )}
        </ul>
        <div className="mt-8">
          <StoreLocation />
        </div>
      </div>
    </section>
  );
}
