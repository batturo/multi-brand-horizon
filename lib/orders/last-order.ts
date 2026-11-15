"use client";

import type { PlacedOrder } from "@/lib/orders/message";

const KEY = "mbh-last-order";

export type LastOrder = {
  order: PlacedOrder;
  whatsappUrl: string | null;
  openedWhatsapp: boolean;
  /** Local preview: saved only in the in-memory database. */
  preview?: boolean;
};

/** Kept for this browser tab only, so the confirmation survives a trip to WhatsApp and back. */
export function saveLastOrder(o: LastOrder) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(o));
  } catch {
    // ignore
  }
}

let cache: { raw: string | null; value: LastOrder | null } = { raw: null, value: null };

/** Stable result for the same stored value (safe for useSyncExternalStore). */
export function readLastOrder(): LastOrder | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw !== cache.raw) cache = { raw, value: raw ? (JSON.parse(raw) as LastOrder) : null };
    return cache.value;
  } catch {
    return null;
  }
}
