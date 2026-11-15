import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { LOCAL_ADMIN_ID, callRpc, type Role } from "@/lib/local-db/create";
import { as, createTestDb } from "./harness";

const admin: Role = { role: "authenticated", userId: LOCAL_ADMIN_ID };
const shopper: Role = { role: "authenticated", userId: "00000000-0000-4000-8000-00000000000b" };
const anon: Role = { role: "anon" };

type AdminProduct = {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  total_stock: number;
  category_name: string;
  images: unknown[];
  variants: { id: string; size: string; colour: string; stock: number }[];
};

let db: PGlite;
let apparelId: string;

const rpc = <T,>(who: Role, fn: string, args: Record<string, unknown> = {}) => callRpc<T>(db, who, fn, args);

const newProduct = (over: Record<string, unknown> = {}) => ({
  title: "Polo T-Shirt",
  brand: "Test Brand",
  category_id: apparelId,
  gender: "men",
  condition: "new_with_tags",
  mrp: 1299,
  price: 599,
  description: "",
  images: [{ src: "products/2026/a.webp", alt: "Polo T-Shirt by Test Brand" }],
  is_published: true,
  variants: [
    { size: "M", colour: "", stock: 2 },
    { size: "L", colour: "", stock: 1 },
  ],
  ...over,
});

beforeAll(async () => {
  db = await createTestDb({ samples: true });
  await as(db, { role: "owner" }, (q) =>
    q(`insert into auth.users (id) values ('00000000-0000-4000-8000-00000000000b')`),
  );
  const rows = await as(db, { role: "owner" }, (q) =>
    q<{ id: string }>(`select id from categories where slug = 'apparel'`),
  );
  apparelId = rows[0].id;
});

describe("admin access", () => {
  it("refuses the public and signed-in non-admins", async () => {
    await expect(rpc(anon, "admin_summary")).rejects.toThrow(/permission denied/);
    await expect(rpc(shopper, "admin_summary")).rejects.toThrow(/Admins only/);
    await expect(rpc(shopper, "admin_save_product", { p: newProduct() })).rejects.toThrow(/Admins only/);
  });

  it("gives admins a summary", async () => {
    const s = await rpc<Record<string, number>>(admin, "admin_summary");
    expect(s).toMatchObject({ products: 12, published: 11, samples: 12, pending_orders: 0 });
  });
});

describe("brands", () => {
  it("lists each brand once, case-insensitively", async () => {
    const brands = await rpc<string[]>(admin, "admin_list_brands");
    expect(brands.slice(0, 2)).toEqual(["Sample Brand A", "Sample Brand B"]);
    expect(new Set(brands.map((b) => b.toLowerCase())).size).toBe(brands.length);
  });
});

describe("saving products", () => {
  it("creates a product with sizes and a clean slug", async () => {
    const p = await rpc<AdminProduct>(admin, "admin_save_product", { p: newProduct() });
    expect(p.slug).toBe("polo-t-shirt");
    expect(p.total_stock).toBe(3);
    expect(p.category_name).toBe("Apparel");
    expect(p.variants.map((v) => v.size)).toEqual(["M", "L"]);
    const visible = await as(db, anon, (q) => q(`select 1 from products where slug = 'polo-t-shirt'`));
    expect(visible).toHaveLength(1);
  });

  it("gives a second product with the same title a different slug", async () => {
    const p = await rpc<AdminProduct>(admin, "admin_save_product", { p: newProduct() });
    expect(p.slug).toBe("polo-t-shirt-2");
  });

  it("keeps the slug when the title changes, and updates, adds and removes sizes", async () => {
    const p = await rpc<AdminProduct>(admin, "admin_save_product", {
      p: newProduct({ title: "Café Shirt / Blue (XL)!" }),
    });
    expect(p.slug).toBe("caf-shirt-blue-xl");
    const m = p.variants.find((v) => v.size === "M")!;
    const updated = await rpc<AdminProduct>(admin, "admin_save_product", {
      p: newProduct({
        id: p.id,
        title: "Renamed Shirt",
        variants: [
          { id: m.id, size: "M", colour: "", stock: 5 },
          { size: "XL", colour: "Blue", stock: 1 },
        ],
      }),
    });
    expect(updated.slug).toBe("caf-shirt-blue-xl");
    expect(updated.title).toBe("Renamed Shirt");
    expect(updated.variants.map((v) => [v.size, v.stock])).toEqual([
      ["M", 5],
      ["XL", 1],
    ]);
    expect(updated.variants.find((v) => v.size === "M")!.id).toBe(m.id);
  });

  it("rejects bad data using the table rules", async () => {
    await expect(rpc(admin, "admin_save_product", { p: newProduct({ price: 2000 }) })).rejects.toThrow(
      /check constraint/,
    );
    await expect(rpc(admin, "admin_save_product", { p: newProduct({ variants: [] }) })).rejects.toThrow(
      /at least one size/,
    );
    await expect(
      rpc(admin, "admin_save_product", { p: newProduct({ variants: [{ size: "M", colour: "", stock: -1 }] }) }),
    ).rejects.toThrow(/check constraint/);
    await expect(
      rpc(admin, "admin_save_product", {
        p: newProduct({ variants: [{ size: "M", colour: "", stock: 1 }, { size: "M", colour: "", stock: 2 }] }),
      }),
    ).rejects.toThrow(/duplicate key/);
  });
});

describe("duplicate, stock, sold and publish", () => {
  it("duplicates as an unpublished draft with zero stock", async () => {
    const src = await rpc<AdminProduct>(admin, "admin_save_product", { p: newProduct({ title: "Track Jacket" }) });
    const copy = await rpc<AdminProduct>(admin, "admin_duplicate_product", { p_id: src.id });
    expect(copy.title).toBe("Track Jacket (copy)");
    expect(copy.slug).toBe("track-jacket-copy");
    expect(copy.is_published).toBe(false);
    expect(copy.total_stock).toBe(0);
    expect(copy.variants.map((v) => v.size)).toEqual(["M", "L"]);
    expect(copy.images).toEqual(src.images);
  });

  it("edits stock for one size and refuses negatives", async () => {
    const p = await rpc<AdminProduct>(admin, "admin_save_product", { p: newProduct({ title: "Stock Test" }) });
    const vid = p.variants[0].id;
    expect(await rpc<number>(admin, "admin_set_stock", { p_variant_id: vid, p_stock: 7 })).toBe(7);
    await expect(rpc(admin, "admin_set_stock", { p_variant_id: vid, p_stock: -1 })).rejects.toThrow(/0 or more/);
  });

  it("marks sold: every size to zero, page stays published", async () => {
    const p = await rpc<AdminProduct>(admin, "admin_save_product", { p: newProduct({ title: "Sold Test" }) });
    await rpc(admin, "admin_mark_sold", { p_product_id: p.id });
    const after = await rpc<AdminProduct>(admin, "admin_get_product", { p_id: p.id });
    expect(after.total_stock).toBe(0);
    expect(after.is_published).toBe(true);
  });

  it("bulk unpublishes and publishes", async () => {
    const list = await rpc<AdminProduct[]>(admin, "admin_list_products", { p_search: "sample", p_filter: "published" });
    const ids = list.slice(0, 3).map((p) => p.id);
    expect(await rpc<number>(admin, "admin_set_published", { p_ids: ids, p_published: false })).toBe(3);
    const hidden = await as(db, anon, (q) => q(`select 1 from products where id = any($1)`, [ids]));
    expect(hidden).toHaveLength(0);
    await rpc(admin, "admin_set_published", { p_ids: ids, p_published: true });
  });

  it("filters the product list", async () => {
    const sold = await rpc<AdminProduct[]>(admin, "admin_list_products", { p_filter: "sold_out" });
    expect(sold.every((p) => p.total_stock === 0)).toBe(true);
    expect(sold.map((p) => p.slug)).toContain("sample-kids-track-pants");
    const drafts = await rpc<AdminProduct[]>(admin, "admin_list_products", { p_filter: "draft" });
    expect(drafts.every((p) => !p.is_published)).toBe(true);
    const search = await rpc<AdminProduct[]>(admin, "admin_list_products", { p_search: "sneak" });
    expect(search.map((p) => p.slug)).toEqual(["sample-canvas-sneakers"]);
  });
});

describe("orders from the admin", () => {
  it("lists orders and confirms one, reducing stock", async () => {
    const watch = await as(db, { role: "owner" }, (q) =>
      q<{ id: string; stock: number }>(
        `select v.id, v.stock from variants v join products p on p.id = v.product_id where p.slug = 'sample-analog-wrist-watch'`,
      ),
    );
    const placed = await as(db, anon, (q) =>
      q<{ o: { order_number: string } }>(
        `select place_order($1::jsonb, 'Test Customer', '9876543210', 'House 1, Test Street', '140126', 'cod') as o`,
        [JSON.stringify([{ variant_id: watch[0].id, quantity: 2 }])],
      ),
    );
    const orders = await rpc<{ id: string; order_number: string; status: string }[]>(admin, "admin_list_orders", {
      p_status: "pending",
    });
    const o = orders.find((x) => x.order_number === placed[0].o.order_number)!;
    expect(o.status).toBe("pending");
    const confirmed = await rpc<{ status: string; stock_applied: boolean }>(admin, "admin_set_order_status", {
      p_id: o.id,
      p_status: "confirmed",
    });
    expect(confirmed).toMatchObject({ status: "confirmed", stock_applied: true });
    const after = await as(db, { role: "owner" }, (q) =>
      q<{ stock: number }>(`select stock from variants where id = $1`, [watch[0].id]),
    );
    expect(after[0].stock).toBe(watch[0].stock - 2);
    await expect(rpc(admin, "admin_set_order_status", { p_id: o.id, p_status: "pending" })).rejects.toThrow(
      /Cannot change order/,
    );
    await expect(rpc(shopper, "admin_list_orders", {})).rejects.toThrow(/Admins only/);
  });
});

describe("settings and categories", () => {
  it("saves banner and delivery fee; blank banner becomes empty", async () => {
    const s = await rpc<{ sale_banner_text: string | null; delivery_fee: number | null }>(admin, "admin_save_settings", {
      p_sale_banner_text: "  Flat 50% off on footwear  ",
      p_delivery_fee: 60,
    });
    expect(s).toMatchObject({ sale_banner_text: "Flat 50% off on footwear", delivery_fee: 60 });
    const cleared = await rpc<{ sale_banner_text: string | null; delivery_fee: number | null }>(
      admin,
      "admin_save_settings",
      { p_sale_banner_text: " ", p_delivery_fee: null },
    );
    expect(cleared).toMatchObject({ sale_banner_text: null, delivery_fee: null });
  });

  it("shows a hidden category once made visible, with intro text", async () => {
    const cats = await rpc<{ id: string; slug: string; is_visible: boolean; product_count: number }[]>(
      admin,
      "admin_list_categories",
    );
    expect(cats).toHaveLength(7);
    const gifts = cats.find((c) => c.slug === "gifts")!;
    expect(gifts.is_visible).toBe(false);
    await rpc(admin, "admin_save_category", { p_id: gifts.id, p_is_visible: true, p_intro: "Gift ideas." });
    const pub = await as(db, anon, (q) => q<{ intro: string }>(`select intro from categories where slug = 'gifts'`));
    expect(pub).toEqual([{ intro: "Gift ideas." }]);
    await rpc(admin, "admin_save_category", { p_id: gifts.id, p_is_visible: false, p_intro: "" });
    const gone = await as(db, anon, (q) => q(`select 1 from categories where slug = 'gifts'`));
    expect(gone).toHaveLength(0);
  });
});
