import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog/data";
import { buildSitemap } from "@/lib/seo/sitemap";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap(await getCatalog());
}
