"use client";

import { sizeText } from "@/lib/catalog/model";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { track } from "@/lib/analytics/client";
import { readLastOrder, saveLastOrder, type LastOrder } from "@/lib/orders/last-order";
import { flattenAddress } from "@/lib/orders/message";
import { PAYMENT_LABELS } from "@/lib/orders/validate";
import { formatINR } from "@/lib/pricing";

const noop = () => () => {};

function trackWhatsapp(last: LastOrder, trigger: "auto" | "button") {
  const o = last.order;
  track({
    name: "whatsapp_order_click",
    orderNumber: o.order_number,
    value: o.total,
    trigger,
    items: o.items.map((it) => ({
      id: it.product_id ?? it.title,
      name: it.title,
      brand: it.brand,
      variant: [it.size, it.colour].filter(Boolean).join(" / ") || undefined,
      price: it.unit_price,
      quantity: it.quantity,
    })),
  });
}

export function OrderSent({ phones }: { phones: { href: string; label: string }[] }) {
  const last = useSyncExternalStore(noop, readLastOrder, () => null);
  const [opening, setOpening] = useState(false);

  // Open WhatsApp once, straight after the order is saved.
  useEffect(() => {
    if (!last?.whatsappUrl || last.openedWhatsapp) return;
    saveLastOrder({ ...last, openedWhatsapp: true });
    const t = setTimeout(() => {
      trackWhatsapp(last, "auto");
      setOpening(true);
      window.location.href = last.whatsappUrl!;
    }, 1200);
    return () => clearTimeout(t);
  }, [last]);

  if (!last) {
    return (
      <div>
        <p>We could not find a recent order in this browser tab.</p>
        <Link href="/" className="mt-4 inline-block underline underline-offset-4">
          Go to the home page
        </Link>
      </div>
    );
  }

  const o = last.order;
  const preview = Boolean(last.preview);

  return (
    <div className="max-w-xl space-y-5">
      {preview && (
        <p className="rounded border-2 border-gold-deep p-3 text-sm font-semibold">
          Preview mode: this order is saved only in the local preview database and is lost when the preview server stops.
        </p>
      )}
      <div className="rounded bg-ink p-5 text-white">
        <p className="text-sm text-white/80">Your order number</p>
        <p className="text-3xl font-bold tracking-wide text-gold">{o.order_number}</p>
        <p className="mt-2 text-sm text-white/85">Keep this number. Your order is not confirmed until we reply.</p>
      </div>

      {last.whatsappUrl ? (
        <div className="space-y-2">
          <p>
            <strong>Last step:</strong> send the message in WhatsApp so we get your order details.
            {opening ? " Opening WhatsApp…" : ""}
          </p>
          <a
            href={last.whatsappUrl}
            onClick={() => trackWhatsapp(last, "button")}
            className="flex min-h-12 items-center justify-center rounded bg-gold px-5 font-semibold text-ink hover:bg-ink hover:text-white"
          >
            Send order on WhatsApp
          </a>
        </div>
      ) : (
        <p>
          We have your order. We will call you on {o.phone} to confirm. You can also call us:{" "}
          {phones.map((p, i) => (
            <span key={p.href}>
              {i > 0 && " or "}
              <a className="underline underline-offset-4" href={p.href}>
                {p.label}
              </a>
            </span>
          ))}
          .
        </p>
      )}

      <section aria-labelledby="sent-summary" className="rounded border border-line p-4 text-sm">
        <h2 id="sent-summary" className="font-semibold">
          Order summary
        </h2>
        <ul className="mt-2 space-y-2">
          {o.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>
                {it.title}
                <span className="block text-muted">
                  {[sizeText(it.size), it.colour, `Qty ${it.quantity}`].filter(Boolean).join(", ")}
                </span>
              </span>
              <span className="shrink-0">{formatINR(it.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-line pt-3">
          <div className="flex justify-between">
            <dt>Items</dt>
            <dd>{formatINR(o.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{o.delivery_fee === null ? "To be confirmed" : o.delivery_fee === 0 ? "Free" : formatINR(o.delivery_fee)}</dd>
          </div>
          <div className="flex justify-between text-base font-bold">
            <dt>{o.delivery_fee === null ? "Total before delivery" : "Total"}</dt>
            <dd>{formatINR(o.total)}</dd>
          </div>
        </dl>
        <p className="mt-3">
          {o.customer_name}, {o.phone}
          <br />
          {flattenAddress(o.address)}, {o.pincode}
          <br />
          Payment: {PAYMENT_LABELS[o.payment_preference]}
        </p>
      </section>

      <Link href="/" className="inline-block underline underline-offset-4">
        Continue shopping
      </Link>
    </div>
  );
}
