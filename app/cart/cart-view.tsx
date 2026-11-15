"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getFreshVariants } from "@/app/cart/actions";
import {
  MAX_PER_LINE,
  cartSubtotal,
  reconcileCart,
  removeFromCart,
  setQuantity,
  type CartNotice,
} from "@/lib/cart/cart";
import { useCart, writeCart } from "@/lib/cart/store";
import { discountPercent, formatINR } from "@/lib/pricing";

export function CartView({ deliveryFee }: { deliveryFee: number | null }) {
  const cart = useCart();
  const [notices, setNotices] = useState<CartNotice[]>([]);
  const [done, setDone] = useState(false);
  const refreshed = useRef(false);

  // Once per visit, bring prices and stock up to date.
  useEffect(() => {
    if (refreshed.current || cart.lines.length === 0) return;
    refreshed.current = true;
    getFreshVariants(cart.lines.map((l) => l.variantId))
      .then((fresh) => {
        const result = reconcileCart(cart, fresh);
        setNotices(result.notices);
        writeCart(result.cart);
      })
      .catch(() => {
        // Keep showing the saved cart; prices are checked again at order time.
      })
      .finally(() => setDone(true));
  }, [cart]);

  if (cart.lines.length === 0) {
    return (
      <div>
        {notices.length > 0 && <Notices notices={notices} />}
        <p className="mt-4">Your cart is empty.</p>
        <Link href="/" className="mt-4 inline-block rounded bg-ink px-5 py-3 font-semibold text-white">
          Browse items
        </Link>
      </div>
    );
  }

  const subtotal = cartSubtotal(cart);
  const checked = done;

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_20rem]">
      <div>
        {notices.length > 0 && <Notices notices={notices} />}
        <ul className="divide-y divide-line border-y border-line">
          {cart.lines.map((l) => {
            const off = discountPercent(l.mrp, l.price);
            return (
              <li key={l.variantId} className="flex gap-3 py-4">
                <Link href={`/p/${l.slug}`} className="relative block aspect-[4/5] w-20 shrink-0 overflow-hidden rounded border border-line bg-white">
                  {l.image && (
                    <Image
                      src={l.image}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-contain"
                      unoptimized={l.image.endsWith(".svg")}
                    />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase text-muted">{l.brand}</p>
                  <Link href={`/p/${l.slug}`} className="block font-medium hover:underline">
                    {l.title}
                  </Link>
                  <p className="text-sm text-muted">{[l.size && `Size ${l.size}`, l.colour].filter(Boolean).join(", ")}</p>
                  <p className="mt-1 text-sm">
                    <span className="font-semibold">{formatINR(l.price)}</span>
                    {off > 0 && (
                      <>
                        {" "}
                        <span className="text-muted">
                          MRP <s>{formatINR(l.mrp)}</s>
                        </span>{" "}
                        <span className="text-gold-deep">{off}% off</span>
                      </>
                    )}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <label className="text-sm" htmlFor={`qty-${l.variantId}`}>
                      Qty
                    </label>
                    <select
                      id={`qty-${l.variantId}`}
                      value={l.quantity}
                      onChange={(e) => writeCart(setQuantity(cart, l.variantId, Number(e.target.value)))}
                      className="rounded border border-line bg-white px-2 py-1.5"
                    >
                      {Array.from({ length: Math.max(1, Math.min(l.stock, MAX_PER_LINE)) }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => writeCart(removeFromCart(cart, l.variantId))}
                      className="text-sm underline underline-offset-4"
                    >
                      Remove<span className="sr-only"> {l.title}</span>
                    </button>
                  </div>
                </div>
                <p className="shrink-0 font-semibold">{formatINR(l.price * l.quantity)}</p>
              </li>
            );
          })}
        </ul>
      </div>

      <aside aria-labelledby="summary" className="h-fit rounded border border-line p-4">
        <h2 id="summary" className="font-semibold">
          Summary
        </h2>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>Items</dt>
            <dd>{formatINR(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{deliveryFee === null ? "Confirmed on WhatsApp" : deliveryFee === 0 ? "Free" : formatINR(deliveryFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
            <dt>{deliveryFee === null ? "Total before delivery" : "Total"}</dt>
            <dd>{formatINR(subtotal + (deliveryFee ?? 0))}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted">Prices include taxes. {checked ? "Prices and stock checked just now." : "Checking prices and stock…"}</p>
        <p className="mt-4 rounded bg-ink/5 p-3 text-sm">
          Ordering online opens soon. Until then, visit the shop or call us to buy these items.
        </p>
      </aside>
    </div>
  );
}

function Notices({ notices }: { notices: CartNotice[] }) {
  return (
    <div role="status" className="mb-4 rounded border-2 border-gold-deep p-3 text-sm">
      <p className="font-semibold">Your cart was updated:</p>
      <ul className="mt-1 list-disc pl-5">
        {notices.map((n) => (
          <li key={`${n.variantId}-${n.message}`}>
            {n.title} {n.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
