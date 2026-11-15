"use client";

import { cartCount } from "@/lib/cart/cart";
import { useCart } from "@/lib/cart/store";

export function CartCount() {
  const n = cartCount(useCart());
  return (
    <>
      Cart
      {n > 0 && (
        <span className="ml-1 rounded-full bg-gold px-1.5 text-xs font-bold text-ink">
          {n}
          <span className="sr-only"> items</span>
        </span>
      )}
    </>
  );
}
