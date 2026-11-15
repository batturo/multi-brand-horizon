import { Suspense } from "react";
import { AdminLoading } from "@/components/admin-loading";
import type { Metadata } from "next";
import Link from "next/link";
import { OrderActions } from "./order-actions";
import { adminRpc } from "@/lib/admin/rpc";
import { getAdminSession } from "@/lib/admin/session";
import type { AdminOrder } from "@/lib/admin/types";
import { sizeText } from "@/lib/catalog/model";
import { flattenAddress } from "@/lib/orders/message";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orders/status";
import { PAYMENT_LABELS } from "@/lib/orders/validate";
import { formatINR } from "@/lib/pricing";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Orders" };

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-gold text-ink",
  confirmed: "bg-ink text-white",
  dispatched: "bg-blue-800 text-white",
  delivered: "bg-green-800 text-white",
  cancelled: "bg-line text-ink",
};

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function OrdersPage(props: PageProps<"/admin/orders">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <OrdersPageContent {...props} />
    </Suspense>
  );
}

async function OrdersPageContent({ searchParams }: PageProps<"/admin/orders">) {
  if ((await getAdminSession()).status !== "admin") return null;
  const sp = await searchParams;
  const raw = typeof sp.status === "string" ? sp.status : "pending";
  const status = (ORDER_STATUSES as readonly string[]).includes(raw) ? (raw as OrderStatus) : null;
  const orders = await adminRpc<AdminOrder[]>("admin_list_orders", { p_status: status, p_limit: 200 });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders</h1>
      <nav aria-label="Order status">
        <ul className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1">
          {[...ORDER_STATUSES, "all" as const].map((s) => {
            const active = (s === "all" && status === null) || s === status;
            return (
              <li key={s}>
                <Link
                  href={`/admin/orders?status=${s}`}
                  aria-current={active ? "page" : undefined}
                  className={`inline-block rounded-full border px-3 py-1.5 text-sm ${active ? "border-ink bg-ink text-white" : "border-line bg-white"}`}
                >
                  {s === "all" ? "All" : ORDER_STATUS_LABELS[s]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {orders.length === 0 ? (
        <p className="rounded bg-white p-4">No {status ? ORDER_STATUS_LABELS[status].toLowerCase() : ""} orders.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="rounded border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold">{o.order_number}</p>
                  <p className="text-xs text-muted">{when(o.created_at)}</p>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[o.status]}`}>
                  {ORDER_STATUS_LABELS[o.status]}
                </span>
              </div>

              <div className="mt-3 text-sm leading-6">
                <p className="font-semibold">{o.customer_name}</p>
                <p className="flex flex-wrap gap-x-4">
                  <a className="underline underline-offset-4" href={`tel:+91${o.phone}`}>
                    Call {o.phone}
                  </a>
                  <a
                    className="underline underline-offset-4"
                    href={whatsappLink(`+91${o.phone}`, `Hi ${o.customer_name}, about your order ${o.order_number}:`)}
                    target="_blank"
                    rel="noopener"
                  >
                    WhatsApp
                  </a>
                </p>
                <p>
                  {flattenAddress(o.address)}, {o.pincode}
                </p>
                <p>Payment: {PAYMENT_LABELS[o.payment_preference]}</p>
              </div>

              <ul className="mt-3 divide-y divide-line border-y border-line text-sm">
                {o.items.map((it) => (
                  <li key={it.variant_id} className="flex justify-between gap-3 py-2">
                    <span>
                      <Link href={`/p/${it.slug}`} target="_blank" className="underline underline-offset-4">
                        {it.title}
                      </Link>{" "}
                      <span className="text-muted">({it.brand})</span>
                      <span className="block text-muted">
                        {[sizeText(it.size), it.colour, `Qty ${it.quantity}`].filter(Boolean).join(", ")}
                      </span>
                    </span>
                    <span className="shrink-0">{formatINR(it.line_total)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-right text-sm">
                Delivery {o.delivery_fee === null ? "not set" : formatINR(o.delivery_fee)} · <strong>Total {formatINR(o.total)}</strong>
              </p>

              <OrderActions id={o.id} number={o.order_number} status={o.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
