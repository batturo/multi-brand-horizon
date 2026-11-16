import { store } from "@/config/store";

/**
 * Public site origin, no trailing slash. In order: NEXT_PUBLIC_SITE_URL,
 * store.siteUrl, the Netlify or Vercel production address, then localhost.
 */
export function siteUrl(): string {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  // Netlify sets URL to the site's main address (custom domain once added).
  const netlify = process.env.NETLIFY ? process.env.URL : undefined;
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    store.siteUrl ||
    netlify ||
    (vercel ? `https://${vercel}` : "") ||
    "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
