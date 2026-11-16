import type { MetadataRoute } from "next";
import { productImageUrl } from "@/lib/catalog/images";
import type { Catalog } from "@/lib/catalog/model";
import { absoluteUrl } from "@/lib/site";

/** Public pages that are always in the sitemap. Cart, checkout, search and admin never are. */
export const STATIC_PAGES = ["/", "/visit", "/about", "/delivery", "/returns", "/contact", "/privacy", "/terms"];

export function buildSitemap(catalog: Catalog): MetadataRoute.Sitemap {
  const latest = catalog.products.reduce<string | null>((m, p) => (!m || p.updatedAt > m ? p.updatedAt : m), null);
  const latestByCategory = new Map<string, string>();
  for (const p of catalog.products) {
    const cur = latestByCategory.get(p.categoryId);
    if (!cur || p.updatedAt > cur) latestByCategory.set(p.categoryId, p.updatedAt);
  }
  return [
    ...STATIC_PAGES.map((path) => ({
      url: absoluteUrl(path),
      ...(path === "/" && latest ? { lastModified: latest } : {}),
    })),
    // Catalogue data has already been through row level security, so hidden
    // categories and unpublished products are not here.
    ...catalog.categories.map((c) => ({
      url: absoluteUrl(`/c/${c.slug}`),
      ...(latestByCategory.get(c.id) ? { lastModified: latestByCategory.get(c.id) } : {}),
    })),
    ...catalog.products.map((p) => ({
      url: absoluteUrl(`/p/${p.slug}`),
      lastModified: p.updatedAt,
      ...(p.images[0] ? { images: [absoluteUrl(productImageUrl(p.images[0].src))] } : {}),
    })),
  ];
}
