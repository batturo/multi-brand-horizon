import { Suspense } from "react";
import { AdminLoading } from "@/components/admin-loading";
import type { Metadata } from "next";
import { CategoryEditor, ShopSettingsForm } from "./settings-forms";
import { adminRpc } from "@/lib/admin/rpc";
import { getAdminSession } from "@/lib/admin/session";
import type { AdminCategory } from "@/lib/admin/types";
import { getCatalog } from "@/lib/catalog/data";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <SettingsPageContent />
    </Suspense>
  );
}

async function SettingsPageContent() {
  if ((await getAdminSession()).status !== "admin") return null;
  const [categories, { settings }] = await Promise.all([adminRpc<AdminCategory[]>("admin_list_categories"), getCatalog()]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <ShopSettingsForm banner={settings.sale_banner_text ?? ""} fee={settings.delivery_fee} />
      <section aria-labelledby="cats-h" className="space-y-3">
        <h2 id="cats-h" className="text-lg font-bold">
          Categories
        </h2>
        <p className="text-sm text-muted">
          Hidden categories, and everything in them, do not appear anywhere in the shop or to search engines. Each
          visible category should have 80 to 120 words of intro text: what you stock, sizes, condition, and that it
          is in Naya Nangal.
        </p>
        <ul className="space-y-3">
          {categories.map((c) => (
            <li key={c.id}>
              <CategoryEditor category={c} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
