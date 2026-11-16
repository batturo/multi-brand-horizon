"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/client";
import type { TrackItem } from "@/lib/analytics/events";

/** Sends view_item once when a product page is shown. */
export function TrackViewItem({ item }: { item: TrackItem }) {
  useEffect(() => {
    track({ name: "view_item", item });
    // Only once per product.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);
  return null;
}
