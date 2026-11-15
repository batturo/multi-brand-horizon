import { describe, expect, it } from "vitest";
import { demoCatalog } from "./fixtures/sample-catalog";
import {
  applyFilters,
  facets,
  filtersToQuery,
  paginate,
  parseFilters,
  similarProducts,
  sortProducts,
} from "@/lib/catalog/filters";
import { buildCatalog, compareSizes, variantLabel } from "@/lib/catalog/model";
import type { Category, Product, Variant } from "@/lib/types";

const { products } = demoCatalog();
const bySlug = (s: string) => products.find((p) => p.slug === s)!;

describe("buildCatalog", () => {
  it("drops unpublished products and products in hidden categories", () => {
    const cats: Category[] = [
      { id: "a", name: "A", slug: "a", parent_id: null, is_visible: true, intro: null, sort_order: 1 },
      { id: "h", name: "H", slug: "h", parent_id: null, is_visible: false, intro: null, sort_order: 2 },
    ];
    const base: Omit<Product, "id" | "title" | "slug" | "category_id" | "is_published"> = {
      brand: "B", gender: "unisex", condition: "new_with_tags", mrp: 100, price: 50, description: "",
      images: [], is_sample: false, published_at: null, created_at: "2026-01-01", updated_at: "2026-01-01",
    };
    const prods: Product[] = [
      { ...base, id: "1", title: "Shown", slug: "shown", category_id: "a", is_published: true },
      { ...base, id: "2", title: "Draft", slug: "draft", category_id: "a", is_published: false },
      { ...base, id: "3", title: "Hidden", slug: "hidden", category_id: "h", is_published: true },
    ];
    const variants: Variant[] = [{ id: "v", product_id: "1", size: "M", colour: "", stock: 2, sort_order: 0 }];
    const c = buildCatalog(cats, prods, variants, null);
    expect(c.products.map((p) => p.slug)).toEqual(["shown"]);
    expect(c.categories.map((x) => x.slug)).toEqual(["a"]);
    expect(c.products[0]).toMatchObject({ totalStock: 2, soldOut: false, discount: 50 });
  });

  it("marks products with no stock as sold out", () => {
    expect(bySlug("sample-kids-track-pants").soldOut).toBe(true);
    expect(bySlug("sample-crew-neck-t-shirt").soldOut).toBe(false);
  });
});

describe("sizes", () => {
  it("sorts letter, number and UK sizes sensibly", () => {
    expect(["XL", "S", "M", "XS"].sort(compareSizes)).toEqual(["XS", "S", "M", "XL"]);
    expect(["34", "30", "32"].sort(compareSizes)).toEqual(["30", "32", "34"]);
    expect(["UK 10", "UK 7", "UK 9"].sort(compareSizes)).toEqual(["UK 7", "UK 9", "UK 10"]);
  });
  it("labels variants", () => {
    expect(variantLabel({ size: "M", colour: "Black" })).toBe("M / Black");
    expect(variantLabel({ size: "", colour: "" })).toBe("One size");
  });
});

describe("parseFilters", () => {
  it("reads repeated params and ignores junk", () => {
    const f = parseFilters({
      brand: ["Sample Brand A", "Sample Brand A", "Sample Brand B"],
      condition: ["new_with_tags", "bogus"],
      min: "100",
      max: "abc",
      sort: "price_asc",
      page: "-3",
    });
    expect(f.brands).toEqual(["Sample Brand A", "Sample Brand B"]);
    expect(f.conditions).toEqual(["new_with_tags"]);
    expect(f.min).toBe(100);
    expect(f.max).toBeNull();
    expect(f.sort).toBe("price_asc");
    expect(f.page).toBe(1);
  });
  it("swaps a reversed price range and defaults an unknown sort", () => {
    const f = parseFilters({ min: "900", max: "100", sort: "cheapest" });
    expect([f.min, f.max]).toEqual([100, 900]);
    expect(f.sort).toBe("newest");
  });
  it("round-trips through the URL, dropping defaults", () => {
    const f = parseFilters({ brand: "Sample Brand A", size: ["M", "L"], sort: "newest", page: "1" });
    expect(filtersToQuery(f)).toBe("?brand=Sample+Brand+A&size=M&size=L");
    expect(parseFilters(Object.fromEntries(new URLSearchParams("brand=X")))).toMatchObject({ brands: ["X"] });
    expect(filtersToQuery(parseFilters({}))).toBe("");
  });
});

describe("applyFilters", () => {
  const f = (sp: Record<string, string | string[]>) => applyFilters(products, parseFilters(sp));

  it("filters by brand, case-insensitively", () => {
    expect(f({ brand: "sample brand e" }).map((p) => p.slug).sort()).toEqual([
      "sample-backpack-25l",
      "sample-running-shoes",
    ]);
  });
  it("filters by size using only sizes in stock", () => {
    // XL of the T-shirt has 0 stock, so it must not match.
    expect(f({ size: "XL" }).map((p) => p.slug)).toEqual([]);
    expect(f({ size: "UK 9" }).map((p) => p.slug)).toEqual(["sample-running-shoes"]);
  });
  it("filters by price range and condition", () => {
    const r = f({ min: "1000", max: "2000", condition: "open_box_like_new" });
    expect(r.map((p) => p.slug).sort()).toEqual(["sample-analog-wrist-watch", "sample-slim-fit-jeans"]);
  });
  it("searches by word prefix across title, brand and category", () => {
    expect(f({ q: "sneak" }).map((p) => p.slug)).toEqual(["sample-canvas-sneakers"]);
    expect(f({ q: "footwear sandal" }).map((p) => p.slug)).toEqual(["sample-flat-sandals"]);
    expect(f({ q: "nothing-like-this" })).toEqual([]);
  });
});

describe("sorting and paging", () => {
  it("puts sold-out items last whatever the sort", () => {
    const sorted = sortProducts(products, "price_asc");
    expect(sorted.at(-1)!.slug).toBe("sample-kids-track-pants");
    const prices = sorted.slice(0, -1).map((p) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
  it("sorts by discount", () => {
    const d = sortProducts(products, "discount").filter((p) => !p.soldOut).map((p) => p.discount);
    expect(d).toEqual([...d].sort((a, b) => b - a));
  });
  it("paginates and clamps the page", () => {
    const r = paginate([1, 2, 3, 4, 5], 9, 2);
    expect(r).toEqual({ items: [5], page: 3, pages: 3, total: 5 });
  });
});

describe("facets and similar items", () => {
  it("offers only brands, sizes and conditions that exist", () => {
    const fx = facets(products.filter((p) => p.categorySlug === "footwear"));
    expect(fx.brands.map((b) => b.name)).toEqual(["Sample Brand B", "Sample Brand E", "Sample Brand F"]);
    expect(fx.sizes).toEqual(["UK 4", "UK 5", "UK 6", "UK 7", "UK 8", "UK 9"]);
    expect(fx.priceMin).toBe(649);
    expect(fx.priceMax).toBe(2299);
  });
  it("suggests in-stock items from the same category first", () => {
    const sold = bySlug("sample-kids-track-pants");
    const sim = similarProducts(sold, products, 4);
    expect(sim).toHaveLength(4);
    expect(sim.every((p) => !p.soldOut && p.id !== sold.id)).toBe(true);
    expect(sim.every((p) => p.categorySlug === "apparel")).toBe(true);
  });
});
