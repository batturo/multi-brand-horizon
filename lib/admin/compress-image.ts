"use client";

import { ATTEMPTS, MAX_BYTES, fitWithin } from "@/lib/admin/image-resize";

export type Compressed = { blob: Blob; width: number; height: number; type: string };

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Resize and re-encode a photo in the browser before upload, as JPEG.
 * Honors the phone's rotation (EXIF) through createImageBitmap.
 */
export async function compressImage(file: File): Promise<Compressed> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    for (const attempt of ATTEMPTS) {
      const { width, height } = fitWithin(bitmap.width, bitmap.height, attempt.edge);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available");
      ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await toBlob(canvas, "image/jpeg", attempt.quality);
      if (blob && blob.size <= MAX_BYTES) return { blob, width, height, type: blob.type };
    }
    throw new Error("This photo is too large even after shrinking. Try another photo.");
  } finally {
    bitmap.close();
  }
}
