import { supabaseUrl } from "@/lib/env";
import type { ProductImage } from "@/lib/types";

export const PRODUCT_IMAGE_BUCKET = "product-images";

/** Public URL for a product image src (storage path, site path or full URL). */
export function productImageUrl(src: string): string {
  if (src.startsWith("/") || /^https?:\/\//.test(src)) return src;
  const base = supabaseUrl();
  const path = src.split("/").map(encodeURIComponent).join("/");
  return base ? `${base}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${path}` : `/${path}`;
}

export function isSvg(src: string): boolean {
  return /\.svg(\?|$)/i.test(src);
}

/** Images next/image should pass through as-is (vectors, local preview uploads). */
export function skipOptimization(src: string): boolean {
  return isSvg(src) || src.startsWith("/preview-images/");
}

export function imageAlt(img: ProductImage | undefined, fallback: string): string {
  return img?.alt?.trim() || fallback;
}
