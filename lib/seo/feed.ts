import { store } from "@/config/store";
import { conditionLabel } from "@/lib/catalog/conditions";
import { productImageUrl } from "@/lib/catalog/images";
import type { Catalog, CatalogProduct } from "@/lib/catalog/model";
import { absoluteUrl } from "@/lib/site";

/**
 * Product feed in RSS 2.0 with the Google namespace, the format Google
 * Merchant Center and Meta (Facebook/Instagram) catalogues both accept.
 * One item per size/colour, grouped by product (item_group_id).
 */

const esc = (s: string) =>
  s
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** Google product taxonomy ids for our categories. Unknown ones are left out. */
const GOOGLE_CATEGORY: Record<string, string> = {
  apparel: "1604", // Apparel & Accessories > Clothing
  footwear: "187", // Apparel & Accessories > Shoes
  accessories: "167", // Apparel & Accessories > Clothing Accessories
  electronics: "222", // Electronics
  "home-decor": "696", // Home & Garden > Decor
  "sports-and-fitness": "988", // Sporting Goods
};

const GENDER = { men: "male", women: "female", unisex: "unisex", kids: "unisex" } as const;

/** Google accepts new, refurbished or used. Open box items are "used". */
export function feedCondition(p: CatalogProduct): "new" | "used" {
  return p.condition === "new_with_tags" ? "new" : "used";
}

const money = (n: number) => `${n.toFixed(2)} INR`;

function tag(name: string, value: string | null | undefined): string {
  return value ? `<${name}>${esc(value)}</${name}>` : "";
}

export function feedItems(p: CatalogProduct, deliveryFee: number | null): string[] {
  if (p.images.length === 0) return []; // both catalogues reject items without a photo
  const link = absoluteUrl(`/p/${p.slug}`);
  const [main, ...more] = p.images.map((i) => absoluteUrl(productImageUrl(i.src)));
  const description =
    (p.description ? `${p.description} ` : "") +
    `Condition: ${conditionLabel(p.condition)}. MRP ${p.mrp}, our price ${p.price}. Prices include taxes.`;
  const variants = p.variants.length ? p.variants : [{ id: p.id, size: "", colour: "", stock: 0 }];

  return variants.map((v) => {
    const parts = [
      tag("g:id", v.id),
      tag("g:item_group_id", p.variants.length > 1 ? p.id : null),
      tag("g:title", [p.title, v.size && v.size !== "One size" ? `Size ${v.size}` : "", v.colour].filter(Boolean).join(", ")),
      tag("g:description", description.slice(0, 5000)),
      tag("g:link", link),
      tag("g:image_link", main),
      ...more.slice(0, 10).map((m) => tag("g:additional_image_link", m)),
      tag("g:availability", v.stock > 0 ? "in_stock" : "out_of_stock"),
      // Our selling price only. MRP is not sent as a "regular price".
      tag("g:price", money(p.price)),
      tag("g:condition", feedCondition(p)),
      tag("g:brand", p.brand),
      tag("g:identifier_exists", "no"),
      tag("g:google_product_category", GOOGLE_CATEGORY[p.categorySlug]),
      tag("g:product_type", p.categoryName),
      tag("g:gender", GENDER[p.gender]),
      tag("g:age_group", p.gender === "kids" ? "kids" : "adult"),
      tag("g:size", v.size),
      tag("g:color", v.colour),
      deliveryFee !== null
        ? `<g:shipping><g:country>IN</g:country><g:price>${money(deliveryFee)}</g:price></g:shipping>`
        : "",
    ].filter(Boolean);
    return `<item>${parts.join("")}</item>`;
  });
}

export function buildFeedXml(catalog: Catalog): string {
  const items = catalog.products.flatMap((p) => feedItems(p, catalog.settings.delivery_fee));
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`,
    `<channel>`,
    tag("title", store.name),
    tag("link", absoluteUrl("/")),
    tag("description", store.description),
    ...items,
    `</channel>`,
    `</rss>`,
  ].join("\n");
}
