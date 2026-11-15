import { store } from "@/config/store";

/** Public site origin, no trailing slash. */
export function siteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  const url = fromEnv || store.siteUrl || "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
