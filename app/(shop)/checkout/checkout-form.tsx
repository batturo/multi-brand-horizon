"use client";

import { sizeText } from "@/lib/catalog/model";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { placeOrderAction } from "./actions";
import { cartSubtotal, EMPTY_CART } from "@/lib/cart/cart";
import { useCart, writeCart } from "@/lib/cart/store";
import { saveLastOrder } from "@/lib/orders/last-order";
import { orderWhatsappMessage } from "@/lib/orders/message";
import { PAYMENT_LABELS, validateCheckout, type CheckoutInput, type FieldErrors } from "@/lib/orders/validate";
import { formatINR } from "@/lib/pricing";
import { whatsappLink } from "@/lib/whatsapp";

const field = "mt-1 block w-full rounded border border-ink/40 bg-white px-3 py-2.5 text-base";

export function CheckoutForm({ deliveryFee, whatsappNumber }: { deliveryFee: number | null; whatsappNumber: string | null }) {
  const cart = useCart();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<CheckoutInput>({ name: "", phone: "", address: "", pincode: "", payment: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  if (cart.lines.length === 0) {
    return (
      <div>
        <p>Your cart is empty.</p>
        <Link href="/" className="mt-4 inline-block rounded bg-ink px-5 py-3 font-semibold text-white">
          Browse items
        </Link>
      </div>
    );
  }

  const set = (k: keyof CheckoutInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const checked = validateCheckout(values);
    if (!checked.ok) {
      setErrors(checked.errors);
      const first = Object.keys(checked.errors)[0];
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    setErrors({});
    const items = cart.lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity }));
    startTransition(async () => {
      const res = await placeOrderAction(values, items).catch(() => null);
      if (!res) {
        setFormError("Could not reach the shop. Check your internet and try again.");
        return;
      }
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        setFormError(res.formError ?? "Please check the highlighted fields.");
        return;
      }
      const url = whatsappNumber ? whatsappLink(whatsappNumber, orderWhatsappMessage(res.order)) : null;
      saveLastOrder({ order: res.order, whatsappUrl: url, openedWhatsapp: false, preview: res.preview });
      writeCart(EMPTY_CART);
      router.replace("/checkout/sent");
    });
  }

  const subtotal = cartSubtotal(cart);
  const err = (k: keyof CheckoutInput) =>
    errors[k] ? (
      <p id={`e-${k}`} className="mt-1 text-sm font-medium text-red-700">
        {errors[k]}
      </p>
    ) : null;
  const aria = (k: keyof CheckoutInput) => ({
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `e-${k}` : undefined,
  });

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_20rem]">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="f-name" className="font-semibold">
            Your name
          </label>
          <input id="f-name" name="name" autoComplete="name" value={values.name} onChange={set("name")} className={field} {...aria("name")} />
          {err("name")}
        </div>
        <div>
          <label htmlFor="f-phone" className="font-semibold">
            Mobile number
          </label>
          <input
            id="f-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="98765 43210"
            value={values.phone}
            onChange={set("phone")}
            className={field}
            {...aria("phone")}
          />
          {err("phone")}
        </div>
        <div>
          <label htmlFor="f-address" className="font-semibold">
            Delivery address
          </label>
          <textarea
            id="f-address"
            name="address"
            rows={3}
            autoComplete="street-address"
            placeholder="House number, street, area, town"
            value={values.address}
            onChange={set("address")}
            className={field}
            {...aria("address")}
          />
          {err("address")}
        </div>
        <div>
          <label htmlFor="f-pincode" className="font-semibold">
            PIN code
          </label>
          <input
            id="f-pincode"
            name="pincode"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={7}
            placeholder="140126"
            value={values.pincode}
            onChange={set("pincode")}
            className={`${field} max-w-40`}
            {...aria("pincode")}
          />
          {err("pincode")}
        </div>
        <fieldset aria-describedby={errors.payment ? "e-payment" : undefined}>
          <legend className="font-semibold">How will you pay?</legend>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            {(["cod", "upi"] as const).map((p, i) => (
              <label key={p} className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded border border-ink/40 px-4 has-[:checked]:border-ink has-[:checked]:bg-ink/5">
                <input
                  id={i === 0 ? "f-payment" : undefined}
                  type="radio"
                  name="payment"
                  value={p}
                  checked={values.payment === p}
                  onChange={set("payment")}
                  className="size-5 accent-ink"
                />
                {PAYMENT_LABELS[p]}
              </label>
            ))}
          </div>
          {err("payment")}
        </fieldset>

        {formError && (
          <p role="alert" className="rounded border-2 border-red-700 p-3 text-sm font-medium text-red-800">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="min-h-12 w-full rounded bg-ink px-5 font-semibold text-white hover:bg-ink-soft disabled:opacity-60"
        >
          {pending ? "Sending…" : whatsappNumber ? "Place order and open WhatsApp" : "Place order"}
        </button>
        <p className="text-sm text-muted">
          This sends an order request. Nothing is charged now. We check the items and confirm with you
          {whatsappNumber ? " on WhatsApp" : " by phone"} before anything is dispatched.
        </p>
      </form>

      <aside aria-labelledby="order-summary" className="h-fit rounded border border-line p-4">
        <h2 id="order-summary" className="font-semibold">
          Your order
        </h2>
        <ul className="mt-2 space-y-2 text-sm">
          {cart.lines.map((l) => (
            <li key={l.variantId} className="flex justify-between gap-3">
              <span>
                {l.title}
                <span className="block text-muted">
                  {[sizeText(l.size), l.colour, `Qty ${l.quantity}`].filter(Boolean).join(", ")}
                </span>
              </span>
              <span className="shrink-0">{formatINR(l.price * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Items</dt>
            <dd>{formatINR(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{deliveryFee === null ? "To be confirmed" : deliveryFee === 0 ? "Free" : formatINR(deliveryFee)}</dd>
          </div>
          <div className="flex justify-between text-base font-bold">
            <dt>{deliveryFee === null ? "Total before delivery" : "Total"}</dt>
            <dd>{formatINR(subtotal + (deliveryFee ?? 0))}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted">Prices include taxes. The shop checks the final price when saving your order.</p>
        <Link href="/cart" className="mt-3 inline-block text-sm underline underline-offset-4">
          Change cart
        </Link>
      </aside>
    </div>
  );
}
