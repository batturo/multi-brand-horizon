import { buildCatalog, type Catalog } from "@/lib/catalog/model";
import { SAMPLE_DESCRIPTION, buildSampleRows } from "@/lib/catalog/samples";
import type { Category, Product, Variant } from "@/lib/types";

/** The 12 sample products as a catalogue, for unit tests (no database). */
/** Stable UUID-shaped ids so preview carts look like real ones. */
const demoUuid = (kind: number, n: number) =>
  `00000000-0000-4000-800${kind}-${String(n).padStart(12, "0")}`;

export function demoCatalog(): Catalog {
  const seed: [string, string, boolean, number][] = [
    ["apparel", "Apparel", true, 10],
    ["footwear", "Footwear", true, 20],
    ["accessories", "Accessories", true, 30],
  ];
  const categories: Category[] = seed.map(([slug, name, is_visible, sort_order]) => ({
    id: `demo-cat-${slug}`,
    name,
    slug,
    parent_id: null,
    is_visible,
    intro: null,
    sort_order,
  }));
  const ids = Object.fromEntries(categories.map((c) => [c.slug, c.id]));
  const products: Product[] = [];
  const variants: Variant[] = [];
  // Spread "published" dates so "newest" sorting has something to show.
  const base = Date.UTC(2026, 0, 1);
  buildSampleRows(ids).forEach(({ product, variants: vs }, i) => {
    const id = demoUuid(1, i + 1);
    const at = new Date(base + i * 86_400_000).toISOString();
    products.push({
      ...product,
      id,
      description: SAMPLE_DESCRIPTION,
      published_at: product.is_published ? at : null,
      created_at: at,
      updated_at: at,
    });
    vs.forEach((v, j) => variants.push({ ...v, id: demoUuid(2, (i + 1) * 100 + j + 1), product_id: id }));
  });
  return buildCatalog(categories, products, variants, { sale_banner_text: null, delivery_fee: null });
}
