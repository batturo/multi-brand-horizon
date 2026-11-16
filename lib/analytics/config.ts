/**
 * Analytics IDs. Each tool is switched on only when its ID is set in the
 * environment (see .env.example). With no IDs, no tracking code loads.
 */
export function gaId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_ID?.trim();
  return id && /^G-[A-Z0-9]+$/i.test(id) ? id : null;
}

export function metaPixelId(): string | null {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  return id && /^\d{6,20}$/.test(id) ? id : null;
}

/** Google Search Console HTML-tag verification code (content="..."). */
export function googleSiteVerification(): string | null {
  const v = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  return v && /^[\w-]{10,100}$/.test(v) ? v : null;
}
