import { discountPercent } from "@/lib/pricing";
import type { Condition } from "@/lib/catalog/conditions";
import type { Category, Gender, Product, ProductImage, Settings, Variant } from "@/lib/types";

export type CatalogVariant = Pick<Variant, "id" | "size" | "colour" | "stock">;

export type CatalogProduct = {
  id: string;
  title: string;
  slug: string;
  brand: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  gender: Gender;
  condition: Condition;
  mrp: number;
  price: number;
  discount: number;
  description: string;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
  variants: CatalogVariant[];
  /** Sum of stock across variants. Real stock, never padded. */
  totalStock: number;
  soldOut: boolean;
};

export type Catalog = {
  categories: Category[];
  products: CatalogProduct[];
  settings: Settings;
};

/**
 * Join raw rows into the shape pages use. Rows are expected to have come
 * through row level security already (only public data), but anything
 * unpublished or without a known category is dropped here too.
 */
export function buildCatalog(
  categories: Category[],
  products: Product[],
  variants: Variant[],
  settings: Settings | null,
): Catalog {
  const visible = categories.filter((c) => c.is_visible);
  const catById = new Map(visible.map((c) => [c.id, c]));
  const variantsByProduct = new Map<string, Variant[]>();
  for (const v of variants) {
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push(v);
    variantsByProduct.set(v.product_id, list);
  }

  const out: CatalogProduct[] = [];
  for (const p of products) {
    const cat = catById.get(p.category_id);
    if (!p.is_published || !cat) continue;
    const vs = (variantsByProduct.get(p.id) ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || compareSizes(a.size, b.size))
      .map(({ id, size, colour, stock }) => ({ id, size, colour, stock }));
    const totalStock = vs.reduce((n, v) => n + Math.max(0, v.stock), 0);
    out.push({
      id: p.id,
      title: p.title,
      slug: p.slug,
      brand: p.brand.trim(),
      categoryId: cat.id,
      categorySlug: cat.slug,
      categoryName: cat.name,
      gender: p.gender,
      condition: p.condition,
      mrp: p.mrp,
      price: p.price,
      discount: discountPercent(p.mrp, p.price),
      description: p.description,
      images: Array.isArray(p.images) ? p.images.filter((i) => i && typeof i.src === "string") : [],
      createdAt: p.published_at ?? p.created_at,
      updatedAt: p.updated_at,
      variants: vs,
      totalStock,
      soldOut: totalStock === 0,
    });
  }

  return {
    categories: visible.slice().sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    products: out,
    settings: settings ?? { sale_banner_text: null, delivery_fee: null },
  };
}

const LETTER_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL"];

/** Sort sizes the way people expect: XS < S < M, 28 < 30, UK 6 < UK 7. */
export function compareSizes(a: string, b: string): number {
  const ua = a.toUpperCase().trim();
  const ub = b.toUpperCase().trim();
  const la = LETTER_SIZES.indexOf(ua);
  const lb = LETTER_SIZES.indexOf(ub);
  if (la !== -1 && lb !== -1) return la - lb;
  if (la !== -1) return -1;
  if (lb !== -1) return 1;
  const na = ua.match(/(\d+(\.\d+)?)/);
  const nb = ub.match(/(\d+(\.\d+)?)/);
  const pa = ua.replace(/[\d.]+.*$/, "");
  const pb = ub.replace(/[\d.]+.*$/, "");
  if (na && nb && pa === pb) return Number(na[1]) - Number(nb[1]);
  return ua.localeCompare(ub);
}

/** Display text for a variant: "M", "M / Black", "Black". */
export function variantLabel(v: Pick<CatalogVariant, "size" | "colour">): string {
  return [v.size, v.colour].filter(Boolean).join(" / ") || "One size";
}
