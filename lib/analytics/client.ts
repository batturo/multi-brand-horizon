"use client";

import { toGa, toMeta, type ShopEvent } from "@/lib/analytics/events";
import { gaId, metaPixelId } from "@/lib/analytics/config";

type W = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; callMethod?: (...a: unknown[]) => void };
  _fbq?: unknown;
};

/** The standard gtag stub: queues calls until the real script loads. */
export function ensureGtag(): ((...args: unknown[]) => void) | null {
  if (typeof window === "undefined" || !gaId()) return null;
  const w = window as W;
  w.dataLayer = w.dataLayer || [];
  if (!w.gtag) {
    w.gtag = function gtag() {
      // gtag.js reads the arguments object itself, so push it as-is.
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    };
  }
  return w.gtag;
}

/** The standard Meta Pixel stub (from Meta's snippet, without the script tag). */
export function ensureFbq(): W["fbq"] | null {
  if (typeof window === "undefined" || !metaPixelId()) return null;
  const w = window as W;
  if (!w.fbq) {
    const n = function fbq(...args: unknown[]) {
      if (n.callMethod) n.callMethod(...args);
      else n.queue!.push(args);
    } as NonNullable<W["fbq"]> & { push?: unknown; loaded?: boolean; version?: string };
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    w.fbq = n;
    if (!w._fbq) w._fbq = n;
  }
  return w.fbq;
}

/** Send a shop event to every analytics tool that is switched on. Never throws. */
export function track(e: ShopEvent) {
  try {
    const gtag = ensureGtag();
    if (gtag) {
      const g = toGa(e);
      gtag("event", g.event, g.params);
    }
    const fbq = ensureFbq();
    if (fbq) {
      const m = toMeta(e);
      fbq(m.kind, m.event, m.params);
    }
  } catch {
    // Analytics must never break the shop.
  }
}
