/** Photo size limits for uploads. Phones take 4000px+ photos; we keep 1600px. */
export const MAX_EDGE = 1600;
export const MAX_BYTES = 950 * 1024; // below the 1 MB server action limit

/** Scale (w, h) to fit inside max x max, never upscaling. */
export function fitWithin(width: number, height: number, max = MAX_EDGE): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Quality steps to try, then smaller sizes, until the file fits. */
export const ATTEMPTS: { edge: number; quality: number }[] = [
  { edge: 1600, quality: 0.82 },
  { edge: 1600, quality: 0.7 },
  { edge: 1280, quality: 0.72 },
  { edge: 1024, quality: 0.7 },
  { edge: 800, quality: 0.65 },
];
