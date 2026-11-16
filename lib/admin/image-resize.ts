/**
 * Photo limits for uploads. Phones take 4000px+ photos. We keep 1200px JPEG
 * under ~300 KB: sharp on phones, and accepted everywhere the photo goes
 * (WhatsApp link previews need small JPEG/PNG; Google Merchant and Meta
 * catalogues accept JPEG).
 */
export const MAX_EDGE = 1200;
export const MAX_BYTES = 300 * 1024;

/** Scale (w, h) to fit inside max x max, never upscaling. */
export function fitWithin(width: number, height: number, max = MAX_EDGE): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Quality steps to try, then smaller sizes, until the file fits. */
export const ATTEMPTS: { edge: number; quality: number }[] = [
  { edge: 1200, quality: 0.82 },
  { edge: 1200, quality: 0.72 },
  { edge: 1080, quality: 0.7 },
  { edge: 960, quality: 0.68 },
  { edge: 800, quality: 0.65 },
];
