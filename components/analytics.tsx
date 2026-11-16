"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { gaId, metaPixelId } from "@/lib/analytics/config";
import { ensureFbq, ensureGtag } from "@/lib/analytics/client";

/**
 * Loads Google Analytics 4 and the Meta Pixel, each only when its ID is set.
 * Scripts load after the page is idle so they never slow the first paint on
 * budget phones. Calls made earlier are queued and sent once they load.
 */
export function Analytics() {
  const ga = gaId();
  const pixel = metaPixelId();
  const pathname = usePathname();
  const started = useRef(false);
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  // Set up both queues once, then count page views on every navigation.
  useEffect(() => {
    if (isAdmin) return; // the shop's own staff pages are never tracked
    if (!started.current) {
      started.current = true;
      const gtag = ensureGtag();
      // GA4 counts page changes itself (enhanced measurement: history events).
      if (gtag && ga) {
        gtag("js", new Date());
        gtag("config", ga);
      }
      const fbq = ensureFbq();
      if (fbq && pixel) fbq("init", pixel);
    }
    ensureFbq()?.("track", "PageView");
  }, [pathname, ga, pixel, isAdmin]);

  if ((!ga && !pixel) || isAdmin) return null;
  return (
    <>
      {ga && <Script id="ga4" src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="lazyOnload" />}
      {pixel && <Script id="meta-pixel" src="https://connect.facebook.net/en_US/fbevents.js" strategy="lazyOnload" />}
    </>
  );
}
