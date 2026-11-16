import type { Metadata } from "next";
import Image from "next/image";
import { store } from "@/config/store";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { JsonLd } from "@/components/json-ld";
import { StoreLocation } from "@/components/store-location";
import { breadcrumbJsonLd, localBusinessJsonLd } from "@/lib/seo/jsonld";
import { openGraph } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/site";

const logoUrl = existsSync(join(process.cwd(), "public", "logo.png")) ? absoluteUrl("/logo.png") : null;

export const metadata: Metadata = {
  title: "Visit the store in Naya Nangal",
  description: "Find Multi Brand Horizon in Naya Nangal, Punjab: address, opening hours, directions and phone numbers.",
  alternates: { canonical: "/visit" },
  openGraph: openGraph({
    title: "Visit Multi Brand Horizon in Naya Nangal",
    description: "Address, opening hours, directions and phone numbers.",
    url: "/visit",
    ...(store.storePhotos?.[0] ? { images: [{ url: store.storePhotos[0].src, alt: store.storePhotos[0].alt }] } : {}),
  }),
};

export default function VisitPage() {
  return (
    <>
      <JsonLd data={localBusinessJsonLd({ logoUrl })} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Visit the store", path: "/visit" }])} />
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="text-2xl font-bold">Visit the store in Naya Nangal</h1>
          <p className="mt-2 max-w-prose text-white/85">
            See the items in person, try sizes and check the condition before you buy.
          </p>
          <div className="mt-8">
            <StoreLocation />
          </div>
        </div>
      </section>

      <div className="prose-page mx-auto max-w-6xl px-4 py-8">
        {store.directions && (
          <>
            <h2>Directions</h2>
            <p>{store.directions}</p>
          </>
        )}
        {store.landmarks && store.landmarks.length > 0 && (
          <>
            <h2>Landmarks nearby</h2>
            <ul>
              {store.landmarks.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </>
        )}
        {store.parking && (
          <>
            <h2>Parking</h2>
            <p>{store.parking}</p>
          </>
        )}
        {store.geo && (
          <>
            <h2>Map</h2>
            <iframe
              title={`Map showing ${store.name} in Naya Nangal`}
              src={`https://www.google.com/maps?q=${store.geo.latitude},${store.geo.longitude}&z=16&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="mt-3 aspect-[4/3] w-full rounded border border-line"
            />
          </>
        )}
        <h2>Before you come</h2>
        <p>
          Stock changes quickly. If you are coming for a particular item or size, call us first and we will check it
          is still here.
        </p>
      </div>

      {store.storePhotos && store.storePhotos.length > 0 && (
        <section aria-labelledby="store-photos" className="mx-auto max-w-6xl px-4 pb-10">
          <h2 id="store-photos" className="text-xl font-bold">
            Photos of the store
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {store.storePhotos.map((ph) => (
              <li key={ph.src} className="relative aspect-[4/3] overflow-hidden rounded">
                <Image src={ph.src} alt={ph.alt} fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
