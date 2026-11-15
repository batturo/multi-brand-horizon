import { Suspense } from "react";
import { AdminLoading } from "@/components/admin-loading";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "../product-form";
import { adminRpc } from "@/lib/admin/rpc";
import { getAdminSession } from "@/lib/admin/session";
import type { AdminCategory, AdminProduct } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Edit product" };

export default function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <EditProductPageContent {...props} />
    </Suspense>
  );
}

async function EditProductPageContent({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  if ((await getAdminSession()).status !== "admin") return null;
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [product, categories, brands] = await Promise.all([
    adminRpc<AdminProduct | null>("admin_get_product", { p_id: id }),
    adminRpc<AdminCategory[]>("admin_list_categories"),
    adminRpc<string[]>("admin_list_brands"),
  ]);
  if (!product) notFound();
  return (
    <div>
      <p className="text-sm">
        <Link href="/admin/products" className="underline underline-offset-4">
          ← Products
        </Link>
      </p>
      <h1 className="mb-1 mt-2 text-2xl font-bold">Edit product</h1>
      <p className="mb-4 text-sm text-muted">
        Shop link: /p/{product.slug} (stays the same if you change the title)
      </p>
      <ProductForm key={product.id} initial={product} categories={categories} brands={brands} copied={sp.copied === "1"} />
    </div>
  );
}
