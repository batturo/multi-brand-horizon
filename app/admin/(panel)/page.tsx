import { Suspense } from "react";
import { AdminLoading } from "@/components/admin-loading";
import Link from "next/link";
import { adminRpc } from "@/lib/admin/rpc";
import { getAdminSession } from "@/lib/admin/session";
import type { AdminSummary } from "@/lib/admin/types";

export default function AdminHome() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminHomeContent />
    </Suspense>
  );
}

async function AdminHomeContent() {
  if ((await getAdminSession()).status !== "admin") return null;
  const s = await adminRpc<AdminSummary>("admin_summary");
  const cards = [
    { href: "/admin/orders?status=pending", label: "Pending orders", value: s.pending_orders, strong: s.pending_orders > 0 },
    { href: "/admin/orders?status=confirmed", label: "Confirmed, to dispatch", value: s.confirmed_orders },
    { href: "/admin/products?filter=published", label: "Products in shop", value: s.published },
    { href: "/admin/products?filter=sold_out", label: "Sold out", value: s.sold_out },
  ];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Today</h1>
      {s.samples > 0 && (
        <p className="rounded border-2 border-gold-deep bg-white p-3 text-sm">
          {s.samples} sample products are in the shop. Remove them before launch with <code>npm run samples:remove</code>.
        </p>
      )}
      <Link
        href="/admin/products/new"
        className="flex min-h-14 items-center justify-center rounded bg-ink text-lg font-semibold text-white"
      >
        + Add a product
      </Link>
      <ul className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className={`block rounded border bg-white p-4 ${c.strong ? "border-gold-deep" : "border-line"}`}
            >
              <span className="block text-3xl font-bold">{c.value}</span>
              <span className="text-sm">{c.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
