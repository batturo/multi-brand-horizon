"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_CART, parseCart, type Cart } from "@/lib/cart/cart";

const KEY = "mbh-cart-v1";
const listeners = new Set<() => void>();
let cached: { raw: string | null; cart: Cart } = { raw: null, cart: EMPTY_CART };

function read(): Cart {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // Storage blocked (private mode): the cart lives in memory only.
    return cached.cart;
  }
  if (raw !== cached.raw) cached = { raw, cart: parseCart(raw) };
  return cached.cart;
}

export function writeCart(cart: Cart) {
  const raw = JSON.stringify(cart);
  cached = { raw, cart };
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Current cart; empty during server render and before hydration. */
export function useCart(): Cart {
  return useSyncExternalStore(subscribe, read, () => EMPTY_CART);
}
