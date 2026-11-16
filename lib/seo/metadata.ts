import type { Metadata } from "next";
import { store } from "@/config/store";

/** The default share image (app/opengraph-image.tsx). */
export const DEFAULT_OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: `${store.name}, Naya Nangal` };

/**
 * Next.js replaces (does not merge) openGraph between layouts and pages, so
 * every page that sets openGraph starts from these, including the default
 * image when the page has no photo of its own.
 */
export function openGraph(og: NonNullable<Metadata["openGraph"]>): Metadata["openGraph"] {
  return { siteName: store.name, locale: "en_IN", type: "website", images: [DEFAULT_OG_IMAGE], ...og };
}
