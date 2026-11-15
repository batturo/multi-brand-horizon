import { Suspense } from "react";
import { AdminLoading } from "@/components/admin-loading";
import type { Metadata } from "next";
import { ProductForm } from "../product-form";
import { adminRpc } from "@/lib/admin/rpc";
import { getAdminSession } from "@/lib/admin/session";
import type { AdminCategory } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Add product" };

export default function NewProductPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <NewProductPageContent />
    </Suspense>
  );
}

async function NewProductPageContent() {
  if ((await getAdminSession()).status !== "admin") return null;
  const [categories, brands] = await Promise.all([
    adminRpc<AdminCategory[]>("admin_list_categories"),
    adminRpc<string[]>("admin_list_brands"),
  ]);
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Add product</h1>
      <ProductForm initial={null} categories={categories} brands={brands} />
    </div>
  );
}
