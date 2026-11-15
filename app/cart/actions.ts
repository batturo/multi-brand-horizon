"use server";

import { getCatalog } from "@/lib/catalog/data";
import { productImageUrl } from "@/lib/catalog/images";
import type { FreshVariant } from "@/lib/cart/cart";

/** Current price and stock for the variants in a visitor's cart. */
export async function getFreshVariants(variantIds: string[]): Promise<FreshVariant[]> {
  const ids = new Set(variantIds.filter((x) => typeof x === "string").slice(0, 50));
  const { products } = await getCatalog();
  const out: FreshVariant[] = [];
  for (const p of products) {
    for (const v of p.variants) {
      if (!ids.has(v.id)) continue;
      out.push({
        variantId: v.id,
        available: true,
        price: p.price,
        mrp: p.mrp,
        stock: v.stock,
        title: p.title,
        brand: p.brand,
        size: v.size,
        colour: v.colour,
        slug: p.slug,
        image: p.images[0] ? productImageUrl(p.images[0].src) : null,
      });
    }
  }
  return out;
}
