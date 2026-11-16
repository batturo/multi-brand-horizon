import { cacheLife, cacheTag } from "next/cache";
import { backendMode, localDb } from "@/lib/backend";
import { createPublicClient } from "@/lib/supabase/public";
import { buildCatalog, type Catalog, type CatalogProduct } from "@/lib/catalog/model";
import type { Category, Product, Settings, Variant } from "@/lib/types";

/** Cache tag for everything read from the catalogue. Admin edits revalidate it. */
export const CATALOG_TAG = "catalog";

const EMPTY: Catalog = { categories: [], products: [], settings: { sale_banner_text: null, delivery_fee: null } };

/** Local preview mode (see lib/backend.ts). Never on a hosted site. */
export function isDemoCatalog(): boolean {
  return backendMode() === "local";
}

/** Same reads as below, run as the public (anon) role on the local database. */
async function localCatalog(): Promise<Catalog> {
  const { asRole } = await import("@/lib/local-db/create");
  const db = await localDb();
  return asRole(db, { role: "anon" }, async (q) => {
    const categories = await q<Category>(
      `select id, name, slug, parent_id, is_visible, intro, sort_order from public.categories`,
    );
    const products = await q<Product>(
      `select id, title, slug, brand, category_id, gender, condition, mrp, price, description, images,
              is_published, is_sample, to_json(published_at) #>> '{}' as published_at, to_json(created_at) #>> '{}' as created_at,
              to_json(updated_at) #>> '{}' as updated_at
       from public.products`,
    );
    const variants = await q<Variant>(`select id, product_id, size, colour, stock, sort_order from public.variants`);
    const [settings] = await q<Settings>(`select sale_banner_text, delivery_fee from public.settings`);
    return buildCatalog(categories, products, variants, settings ?? null);
  });
}

const PAGE = 1000; // Supabase returns at most 1000 rows per request by default.

async function fetchAll<T>(
  run: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await run(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/**
 * The whole public catalogue in one cached read. A single shop's stock fits
 * comfortably in memory, and filtering in code keeps every page consistent.
 * Row level security means hidden categories and unpublished products never
 * arrive here.
 */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  if (isDemoCatalog()) return localCatalog();
  const db = createPublicClient();
  if (!db) return EMPTY;

  try {
    const [categories, products, variants, settings] = await Promise.all([
      fetchAll<Category>((a, b) =>
        db.from("categories").select("id, name, slug, parent_id, is_visible, intro, sort_order").order("id").range(a, b),
      ),
      fetchAll<Product>((a, b) =>
        db
          .from("products")
          .select(
            "id, title, slug, brand, category_id, gender, condition, mrp, price, description, images, is_published, is_sample, published_at, created_at, updated_at",
          )
          .order("id")
          .range(a, b),
      ),
      fetchAll<Variant>((a, b) =>
        db.from("variants").select("id, product_id, size, colour, stock, sort_order").order("id").range(a, b),
      ),
      db.from("settings").select("sale_banner_text, delivery_fee").maybeSingle(),
    ]);
    if (settings.error) throw new Error(settings.error.message);
    return buildCatalog(categories, products, variants, settings.data as Settings | null);
  } catch (err) {
    // Throw rather than cache an empty shop for hours. Pages already in the
    // cache keep being served while this is retried.
    console.error("getCatalog failed:", err instanceof Error ? err.message : err);
    throw err;
  }
}

export async function getNavCategories(): Promise<Category[]> {
  return (await getCatalog()).categories.filter((c) => c.parent_id === null);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return (await getCatalog()).categories.find((c) => c.slug === slug) ?? null;
}

export async function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  return (await getCatalog()).products.find((p) => p.slug === slug) ?? null;
}

/** Products in a category and all its visible sub-categories. */
export async function getCategoryProducts(categoryId: string): Promise<CatalogProduct[]> {
  const { categories, products } = await getCatalog();
  const ids = new Set([categoryId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
        ids.add(c.id);
        grew = true;
      }
    }
  }
  return products.filter((p) => ids.has(p.categoryId));
}
