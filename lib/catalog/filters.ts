import { CONDITIONS, isCondition, type Condition } from "@/lib/catalog/conditions";
import { compareSizes, type CatalogProduct } from "@/lib/catalog/model";

export const SORTS = {
  newest: "Newest first",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  discount: "Biggest discount",
} as const;
export type Sort = keyof typeof SORTS;

export const PAGE_SIZE = 24;

export type Filters = {
  q: string;
  brands: string[];
  sizes: string[];
  conditions: Condition[];
  min: number | null;
  max: number | null;
  sort: Sort;
  page: number;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined, limit = 30): string[] =>
  (Array.isArray(v) ? v : v === undefined ? [] : [v])
    .map((s) => s.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, limit);

const int = (v: string | string[] | undefined): number | null => {
  const s = Array.isArray(v) ? v[0] : v;
  if (!s || !/^\d{1,7}$/.test(s.trim())) return null;
  return Number(s.trim());
};

export function parseFilters(sp: RawSearchParams): Filters {
  const sortRaw = list(sp.sort)[0];
  const page = int(sp.page);
  let min = int(sp.min);
  let max = int(sp.max);
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  return {
    q: (list(sp.q)[0] ?? "").slice(0, 80),
    brands: [...new Set(list(sp.brand))],
    sizes: [...new Set(list(sp.size))],
    conditions: [...new Set(list(sp.condition).filter(isCondition))],
    min,
    max,
    sort: sortRaw && sortRaw in SORTS ? (sortRaw as Sort) : "newest",
    page: page && page > 0 ? Math.min(page, 1000) : 1,
  };
}

/** Back to URL query, dropping defaults so URLs stay short and canonical. */
export function filtersToQuery(f: Partial<Filters>): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  for (const b of f.brands ?? []) p.append("brand", b);
  for (const s of f.sizes ?? []) p.append("size", s);
  for (const c of f.conditions ?? []) p.append("condition", c);
  if (f.min != null) p.set("min", String(f.min));
  if (f.max != null) p.set("max", String(f.max));
  if (f.sort && f.sort !== "newest") p.set("sort", f.sort);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function hasActiveFilters(f: Filters): boolean {
  return (
    f.brands.length > 0 ||
    f.sizes.length > 0 ||
    f.conditions.length > 0 ||
    f.min !== null ||
    f.max !== null
  );
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

export function searchTokens(q: string): string[] {
  return norm(q)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0)
    .slice(0, 8);
}

/** Every token must prefix-match a word in title, brand, category or description. */
export function matchesQuery(p: CatalogProduct, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const words = norm(`${p.title} ${p.brand} ${p.categoryName} ${p.description}`).split(
    /[^\p{L}\p{N}]+/u,
  );
  return tokens.every((t) => words.some((w) => w.startsWith(t)));
}

/** Sizes that are actually in stock for a product. */
export function sizesInStock(p: CatalogProduct): string[] {
  return [...new Set(p.variants.filter((v) => v.stock > 0 && v.size).map((v) => v.size))];
}

export function applyFilters(products: CatalogProduct[], f: Filters): CatalogProduct[] {
  const tokens = searchTokens(f.q);
  const brands = new Set(f.brands.map((b) => b.toLowerCase()));
  const sizes = new Set(f.sizes);
  const conditions = new Set(f.conditions);
  return products.filter(
    (p) =>
      matchesQuery(p, tokens) &&
      (brands.size === 0 || brands.has(p.brand.toLowerCase())) &&
      (sizes.size === 0 || sizesInStock(p).some((s) => sizes.has(s))) &&
      (conditions.size === 0 || conditions.has(p.condition)) &&
      (f.min === null || p.price >= f.min) &&
      (f.max === null || p.price <= f.max),
  );
}

/** In-stock items always come before sold-out ones. */
export function sortProducts(products: CatalogProduct[], sort: Sort): CatalogProduct[] {
  const by: Record<Sort, (a: CatalogProduct, b: CatalogProduct) => number> = {
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    discount: (a, b) => b.discount - a.discount,
  };
  return products
    .slice()
    .sort((a, b) => Number(a.soldOut) - Number(b.soldOut) || by[sort](a, b) || a.title.localeCompare(b.title));
}

export function paginate<T>(items: T[], page: number, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), pages);
  return { items: items.slice((current - 1) * size, current * size), page: current, pages, total: items.length };
}

export type Facets = {
  brands: { name: string; count: number }[];
  sizes: string[];
  conditions: { value: Condition; count: number }[];
  priceMin: number | null;
  priceMax: number | null;
};

/** Options to offer, computed from the products in scope (before filtering). */
export function facets(products: CatalogProduct[]): Facets {
  const brandCounts = new Map<string, { name: string; count: number }>();
  const sizes = new Set<string>();
  const condCounts = new Map<Condition, number>();
  let priceMin: number | null = null;
  let priceMax: number | null = null;
  for (const p of products) {
    const key = p.brand.toLowerCase();
    const b = brandCounts.get(key) ?? { name: p.brand, count: 0 };
    b.count++;
    brandCounts.set(key, b);
    for (const s of sizesInStock(p)) sizes.add(s);
    condCounts.set(p.condition, (condCounts.get(p.condition) ?? 0) + 1);
    priceMin = priceMin === null ? p.price : Math.min(priceMin, p.price);
    priceMax = priceMax === null ? p.price : Math.max(priceMax, p.price);
  }
  return {
    brands: [...brandCounts.values()].sort((a, b) => a.name.localeCompare(b.name)),
    sizes: [...sizes].sort(compareSizes),
    conditions: CONDITIONS.filter((c) => condCounts.has(c)).map((c) => ({ value: c, count: condCounts.get(c)! })),
    priceMin,
    priceMax,
  };
}

/** Same category first, in stock, closest in price. */
export function similarProducts(p: CatalogProduct, all: CatalogProduct[], n = 4): CatalogProduct[] {
  return all
    .filter((o) => o.id !== p.id && !o.soldOut)
    .map((o) => ({
      o,
      score:
        (o.categoryId === p.categoryId ? 0 : 1_000_000) +
        (o.gender === p.gender || o.gender === "unisex" || p.gender === "unisex" ? 0 : 100_000) +
        Math.abs(o.price - p.price),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, n)
    .map((x) => x.o);
}
