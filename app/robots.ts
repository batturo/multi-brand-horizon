import type { MetadataRoute } from "next";
import { absoluteUrl, isNoindexSite } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Preview copies of the shop must stay out of search results.
  if (isNoindexSite()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/cart", "/checkout", "/preview-images/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
