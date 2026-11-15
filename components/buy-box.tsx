"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { addToCart, MAX_PER_LINE } from "@/lib/cart/cart";
import { useCart, writeCart } from "@/lib/cart/store";
import { productEnquiryMessage, whatsappLink } from "@/lib/whatsapp";

type V = { id: string; size: string; colour: string; stock: number };

export function BuyBox({
  product,
  variants,
  url,
  whatsappNumber,
  image,
}: {
  product: { id: string; slug: string; title: string; brand: string; price: number; mrp: number };
  variants: V[];
  url: string;
  whatsappNumber: string | null;
  image: string | null;
}) {
  const cart = useCart();
  const inStock = variants.filter((v) => v.stock > 0);
  const [selected, setSelected] = useState<string | null>(inStock.length === 1 ? inStock[0].id : null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const groupId = useId();
  const chosen = variants.find((v) => v.id === selected) ?? null;
  const inCart = chosen ? (cart.lines.find((l) => l.variantId === chosen.id)?.quantity ?? 0) : 0;
  const soldOut = inStock.length === 0;
  const showPicker = variants.length > 1 || (variants[0] && (variants[0].size || variants[0].colour));

  function add() {
    setMessage(null);
    if (!chosen) {
      setError("Choose a size first.");
      return;
    }
    if (inCart >= Math.min(chosen.stock, MAX_PER_LINE)) {
      setError(`You already have all ${Math.min(chosen.stock, MAX_PER_LINE)} available in your cart.`);
      return;
    }
    setError(null);
    writeCart(
      addToCart(cart, {
        variantId: chosen.id,
        productId: product.id,
        slug: product.slug,
        title: product.title,
        brand: product.brand,
        size: chosen.size,
        colour: chosen.colour,
        price: product.price,
        mrp: product.mrp,
        image,
        stock: chosen.stock,
      }),
    );
    setMessage("Added to cart.");
  }

  const label = (v: V) => [v.size, v.colour].filter(Boolean).join(" / ") || "One size";
  const waText = productEnquiryMessage({ title: product.title, brand: product.brand, url, size: chosen?.size });

  return (
    <div className="space-y-4">
      {showPicker && (
        <fieldset>
          <legend className="font-semibold" id={groupId}>
            {soldOut ? "Sizes" : "Choose size"}
          </legend>
          <ul className="mt-2 flex flex-wrap gap-2">
            {variants.map((v) => {
              const out = v.stock <= 0;
              return (
                <li key={v.id}>
                  <label
                    className={`flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded border px-3 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-gold ${
                      out
                        ? "cursor-not-allowed border-line text-muted line-through"
                        : selected === v.id
                          ? "border-ink bg-ink text-white"
                          : "border-ink/40 hover:border-ink"
                    }`}
                  >
                    <input
                      type="radio"
                      name="variant"
                      value={v.id}
                      disabled={out}
                      checked={selected === v.id}
                      onChange={() => {
                        setSelected(v.id);
                        setError(null);
                        setMessage(null);
                      }}
                      className="sr-only"
                    />
                    {label(v)}
                    <span className="sr-only">{out ? " (sold out)" : ` (${v.stock} in stock)`}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {chosen && (
            <p className="mt-2 text-sm text-muted">
              {chosen.stock} in stock in this size.
            </p>
          )}
        </fieldset>
      )}

      {soldOut ? (
        <p className="rounded bg-ink px-4 py-3 font-semibold text-white">Sold out</p>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={add}
            className="min-h-12 rounded bg-ink px-5 font-semibold text-white hover:bg-ink-soft"
          >
            Add to cart
          </button>
          <p aria-live="polite" className="min-h-6 text-sm">
            {error && <span className="text-red-700">{error}</span>}
            {message && (
              <span>
                {message}{" "}
                <Link href="/cart" className="font-semibold underline underline-offset-4">
                  View cart
                </Link>
              </span>
            )}
          </p>
        </div>
      )}

      {whatsappNumber && (
        <a
          href={whatsappLink(whatsappNumber, waText)}
          rel="noopener"
          target="_blank"
          className="flex min-h-12 items-center justify-center rounded border-2 border-ink px-5 font-semibold hover:bg-ink hover:text-white"
        >
          Ask on WhatsApp
        </a>
      )}
    </div>
  );
}
