import type { BreadcrumbList, ClothingStore, OpeningHoursSpecification, Product, WithContext } from "schema-dts";
import { store } from "@/config/store";
import { conditionLabel, schemaOrgCondition } from "@/lib/catalog/conditions";
import { productImageUrl } from "@/lib/catalog/images";
import type { CatalogProduct } from "@/lib/catalog/model";
import { absoluteUrl } from "@/lib/site";

/**
 * Structured data (schema.org JSON-LD). Built only from confirmed facts in
 * config/store.ts and real catalogue data; TODO fields are left out.
 */

export function localBusinessJsonLd(opts: { logoUrl?: string | null } = {}): WithContext<ClothingStore> {
  const a = store.address;
  const hours: OpeningHoursSpecification[] = (store.hours ?? []).map((h) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: h.days.map((d) => `https://schema.org/${d}` as const) as OpeningHoursSpecification["dayOfWeek"],
    opens: h.opens,
    closes: h.closes,
  }));
  return {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    "@id": absoluteUrl("/#store"),
    name: store.name,
    ...(store.legalName ? { legalName: store.legalName } : {}),
    description: store.description,
    slogan: store.tagline,
    url: absoluteUrl("/"),
    ...(opts.logoUrl ? { logo: opts.logoUrl, image: opts.logoUrl } : {}),
    telephone: store.phones[0],
    ...(store.email ? { email: store.email } : {}),
    address: {
      "@type": "PostalAddress",
      ...(a.street ? { streetAddress: a.street } : {}),
      addressLocality: a.locality,
      addressRegion: a.region,
      ...(a.postalCode ? { postalCode: a.postalCode } : {}),
      addressCountry: a.country,
    },
    ...(store.geo
      ? { geo: { "@type": "GeoCoordinates", latitude: store.geo.latitude, longitude: store.geo.longitude } }
      : {}),
    ...(store.mapUrl ? { hasMap: store.mapUrl } : {}),
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
    ...(store.gstin ? { taxID: store.gstin } : {}),
    currenciesAccepted: "INR",
    sameAs: [store.instagramUrl],
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function productJsonLd(p: CatalogProduct): WithContext<Product> {
  const url = absoluteUrl(`/p/${p.slug}`);
  const images = p.images.map((i) => absoluteUrl(productImageUrl(i.src)));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: p.title,
    description: p.description || `${p.brand} ${p.title}. Condition: ${conditionLabel(p.condition)}.`,
    sku: p.id,
    url,
    ...(images.length ? { image: images } : {}),
    brand: { "@type": "Brand", name: p.brand },
    category: p.categoryName,
    itemCondition: schemaOrgCondition(p.condition) as Product["itemCondition"],
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      price: p.price.toFixed(2),
      availability: p.soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: schemaOrgCondition(p.condition) as Product["itemCondition"],
      ...(p.mrp > p.price
        ? {
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              priceType: "https://schema.org/ListPrice",
              price: p.mrp.toFixed(2),
              priceCurrency: "INR",
            },
          }
        : {}),
      seller: { "@type": "Organization", name: store.legalName ?? store.name, "@id": absoluteUrl("/#store") },
    },
  } as WithContext<Product>;
}

/** Serialise for a <script type="application/ld+json"> tag, safe against "</script>". */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
