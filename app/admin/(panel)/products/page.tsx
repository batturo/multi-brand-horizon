import { Suspense } from "react";
import { AdminLoading } from "@/components/admin-loading";
import type { Metadata } from "next";
import Link from "next/link";
import { ProductsTable } from "./products-table";
import { adminRpc } from "@/lib/admin/rpc";
import { getAdminSession } from "@/lib/admin/session";
import type { AdminProduct } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Products" };

const FILTERS = [
  ["all", "All"],
  ["published", "In shop"],
  ["draft", "Drafts"],
  ["in_stock", "In stock"],
  ["sold_out", "Sold out"],
] as const;

export default function ProductsPage(props: PageProps<"/admin/products">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <ProductsPageContent {...props} />
    </Suspense>
  );
}

async function ProductsPageContent({ searchParams }: PageProps<"/admin/products">) {
  if ((await getAdminSession()).status !== "admin") return null;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const filter = FILTERS.some(([f]) => f === sp.filter) ? (sp.filter as string) : "all";
  const products = await adminRpc<AdminProduct[]>("admin_list_products", { p_search: q || null, p_filter: filter, p_limit: 300 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="rounded bg-ink px-4 py-2.5 font-semibold text-white">
          + Add
        </Link>
      </div>
      <form method="get" className="flex gap-2" role="search">
        <input type="hidden" name="filter" value={filter} />
        <label htmlFor="q" className="sr-only">
          Search products
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search title or brand"
          className="min-w-0 flex-1 rounded border border-ink/40 bg-white px-3 py-2.5"
        />
        <button className="rounded bg-ink px-4 font-semibold text-white">Search</button>
      </form>
      <ul className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1">
        {FILTERS.map(([f, label]) => (
          <li key={f}>
            <Link
              href={`/admin/products?filter=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              aria-current={f === filter ? "page" : undefined}
              className={`inline-block rounded-full border px-3 py-1.5 text-sm ${f === filter ? "border-ink bg-ink text-white" : "border-line bg-white"}`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <ProductsTable products={products} />
    </div>
  );
}
