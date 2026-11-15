import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { ORDER_STATUSES, canTransition } from "@/lib/orders/status";
import { SAMPLE_PRODUCTS, buildSampleRows } from "@/lib/catalog/samples";
import { as, createTestDb } from "./harness";

const ADMIN = "00000000-0000-4000-8000-00000000000a";
const SHOPPER = "00000000-0000-4000-8000-00000000000b"; // signed in, not admin

const admin = { role: "authenticated" as const, userId: ADMIN };
const shopper = { role: "authenticated" as const, userId: SHOPPER };
const anon = { role: "anon" as const };
const owner = { role: "owner" as const };

const customer = {
  name: "Test Customer",
  phone: "+91 98765 43210",
  address: "House 1, Test Street, Naya Nangal",
  pincode: "140126",
};

let db: PGlite;

async function variantId(slug: string, size: string): Promise<string> {
  const rows = await as(db, owner, (q) =>
    q<{ id: string }>(
      `select v.id from variants v join products p on p.id = v.product_id
       where p.slug = $1 and v.size = $2`,
      [slug, size],
    ),
  );
  return rows[0].id;
}

async function stockOf(id: string): Promise<number> {
  const rows = await as(db, owner, (q) =>
    q<{ stock: number }>(`select stock from variants where id = $1`, [id]),
  );
  return rows[0].stock;
}

async function placeOrder(items: { variant_id: string; quantity: number }[]) {
  const rows = await as(db, anon, (q) =>
    q<{ o: Record<string, unknown> }>(
      `select place_order($1::jsonb, $2, $3, $4, $5, 'cod') as o`,
      [JSON.stringify(items), customer.name, customer.phone, customer.address, customer.pincode],
    ),
  );
  return rows[0].o as {
    order_number: string;
    items: { quantity: number; unit_price: number; line_total: number; title: string }[];
    subtotal: number;
    delivery_fee: number | null;
    total: number;
    phone: string;
  };
}

async function setStatus(orderNumber: string, status: string) {
  return as(db, admin, (q) =>
    q(`update orders set status = $2 where order_number = $1 returning status, stock_applied`, [
      orderNumber,
      status,
    ]),
  );
}

beforeAll(async () => {
  db = await createTestDb();
  await as(db, owner, async (q) => {
    await q(`insert into auth.users (id) values ($1), ($2)`, [ADMIN, SHOPPER]);
    await q(`insert into admin_users (user_id) values ($1)`, [ADMIN]);
    const cats = await q<{ id: string; slug: string }>(`select id, slug from categories`);
    const ids = Object.fromEntries(cats.map((c) => [c.slug, c.id]));
    for (const { product, variants } of buildSampleRows(ids)) {
      const [p] = await q<{ id: string }>(
        `insert into products (title, slug, brand, category_id, gender, condition, mrp, price,
           description, images, is_published, is_sample)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12) returning id`,
        [
          product.title, product.slug, product.brand, product.category_id, product.gender,
          product.condition, product.mrp, product.price, product.description,
          JSON.stringify(product.images), product.is_published, product.is_sample,
        ],
      );
      for (const v of variants) {
        await q(
          `insert into variants (product_id, size, colour, stock, sort_order) values ($1,$2,$3,$4,$5)`,
          [p.id, v.size, v.colour, v.stock, v.sort_order],
        );
      }
    }
    // A published product inside a hidden category must stay invisible.
    const [hidden] = await q<{ id: string }>(
      `insert into products (title, slug, brand, category_id, condition, mrp, price, is_published)
       values ('Hidden Speaker', 'hidden-speaker', 'Test', $1, 'new_with_tags', 1000, 500, true)
       returning id`,
      [ids["electronics"]],
    );
    await q(`insert into variants (product_id, size, stock) values ($1, 'One size', 5)`, [hidden.id]);
  });
});

describe("categories", () => {
  it("seeds the seven categories with the right visibility", async () => {
    const rows = await as(db, owner, (q) =>
      q<{ slug: string; is_visible: boolean }>(`select slug, is_visible from categories order by sort_order`),
    );
    expect(rows).toEqual([
      { slug: "apparel", is_visible: true },
      { slug: "footwear", is_visible: true },
      { slug: "accessories", is_visible: true },
      { slug: "electronics", is_visible: false },
      { slug: "home-decor", is_visible: false },
      { slug: "gifts", is_visible: false },
      { slug: "sports-and-fitness", is_visible: false },
    ]);
  });

  it("hides hidden categories from the public", async () => {
    const rows = await as(db, anon, (q) => q<{ slug: string }>(`select slug from categories`));
    expect(rows.map((r) => r.slug).sort()).toEqual(["accessories", "apparel", "footwear"]);
  });

  it("hides a child of a hidden category", async () => {
    await as(db, owner, async (q) => {
      await q(
        `insert into categories (name, slug, parent_id, is_visible)
         select 'Speakers', 'speakers', id, true from categories where slug = 'electronics'`,
      );
      const rows = await q<{ public: boolean }>(
        `select category_is_public(id) as public from categories where slug = 'speakers'`,
      );
      expect(rows[0].public).toBe(false);
      await q(`delete from categories where slug = 'speakers'`);
    });
  });

  it("lets admins see and edit every category, but not the public", async () => {
    const seen = await as(db, admin, (q) => q(`select 1 from categories`));
    expect(seen).toHaveLength(7);
    await expect(
      as(db, anon, (q) => q(`update categories set is_visible = true where slug = 'gifts'`)),
    ).rejects.toThrow(/permission denied/);
    const updated = await as(db, shopper, (q) =>
      q(`update categories set is_visible = true where slug = 'gifts' returning id`),
    );
    expect(updated).toHaveLength(0); // RLS filters it out for non-admins
  });
});

describe("products", () => {
  it("has 12 sample products, all marked as samples", () => {
    expect(SAMPLE_PRODUCTS).toHaveLength(12);
    expect(SAMPLE_PRODUCTS.every((p) => p.title.startsWith("SAMPLE"))).toBe(true);
    expect(SAMPLE_PRODUCTS.every((p) => p.price <= p.mrp)).toBe(true);
  });

  it("shows the public only published products in visible categories", async () => {
    const rows = await as(db, anon, (q) => q<{ slug: string }>(`select slug from products`));
    const slugs = rows.map((r) => r.slug);
    expect(slugs).toHaveLength(11);
    expect(slugs).not.toContain("sample-sunglasses"); // unpublished
    expect(slugs).not.toContain("hidden-speaker"); // hidden category
  });

  it("hides variants of hidden products", async () => {
    const rows = await as(db, anon, (q) =>
      q(`select v.id from variants v join products p on p.id = v.product_id
         where p.slug in ('hidden-speaker', 'sample-sunglasses')`),
    );
    expect(rows).toHaveLength(0);
    const all = await as(db, anon, (q) => q(`select id from variants`));
    expect(all.length).toBeGreaterThan(0);
  });

  it("keeps sold-out products visible", async () => {
    const rows = await as(db, anon, (q) =>
      q<{ stock: number }>(
        `select sum(v.stock)::int as stock from variants v join products p on p.id = v.product_id
         where p.slug = 'sample-kids-track-pants'`,
      ),
    );
    expect(rows[0].stock).toBe(0);
  });

  it("rejects a price above MRP", async () => {
    await expect(
      as(db, owner, (q) =>
        q(`update products set price = mrp + 1 where slug = 'sample-backpack-25l'`),
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it("stops the public and non-admins from writing", async () => {
    await expect(
      as(db, anon, (q) => q(`update products set price = 1 where slug = 'sample-backpack-25l'`)),
    ).rejects.toThrow(/permission denied/);
    const changed = await as(db, shopper, (q) =>
      q(`update products set price = 1 where slug = 'sample-backpack-25l' returning id`),
    );
    expect(changed).toHaveLength(0);
    await expect(
      as(db, shopper, (q) =>
        q(`insert into products (title, slug, brand, category_id, condition, mrp, price)
           select 'x', 'x', 'x', id, 'new_with_tags', 10, 5 from categories limit 1`),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("lets admins edit stock", async () => {
    const id = await variantId("sample-backpack-25l", "One size");
    await as(db, admin, (q) => q(`update variants set stock = 5 where id = $1`, [id]));
    expect(await stockOf(id)).toBe(5);
    await as(db, admin, (q) => q(`update variants set stock = 2 where id = $1`, [id]));
  });

  it("finds products by full text search", async () => {
    const rows = await as(db, anon, (q) =>
      q<{ slug: string }>(
        `select slug from products where search @@ websearch_to_tsquery('simple', 'sneakers')`,
      ),
    );
    expect(rows.map((r) => r.slug)).toEqual(["sample-canvas-sneakers"]);
  });
});

describe("settings", () => {
  it("is readable by everyone and writable only by admins", async () => {
    const rows = await as(db, anon, (q) => q(`select delivery_fee, sale_banner_text from settings`));
    expect(rows).toEqual([{ delivery_fee: null, sale_banner_text: null }]);
    const none = await as(db, shopper, (q) =>
      q(`update settings set delivery_fee = 1 returning id`),
    );
    expect(none).toHaveLength(0);
    await as(db, admin, (q) => q(`update settings set delivery_fee = 50`));
    const after = await as(db, anon, (q) => q<{ delivery_fee: number }>(`select delivery_fee from settings`));
    expect(after[0].delivery_fee).toBe(50);
  });
});

describe("orders", () => {
  it("places an order with prices and totals taken from the database", async () => {
    const tee = await variantId("sample-crew-neck-t-shirt", "M");
    const jeans = await variantId("sample-slim-fit-jeans", "32");
    const order = await placeOrder([
      { variant_id: tee, quantity: 1 },
      { variant_id: jeans, quantity: 1 },
      { variant_id: tee, quantity: 1 }, // merged with the first line
    ]);
    expect(order.order_number).toMatch(/^MBH-\d{5,}$/);
    expect(order.items).toHaveLength(2);
    expect(order.subtotal).toBe(449 * 2 + 1199);
    expect(order.delivery_fee).toBe(50);
    expect(order.total).toBe(449 * 2 + 1199 + 50);
    expect(order.phone).toBe("9876543210");
  });

  it("ignores prices, totals and status sent by the customer", async () => {
    const tee = await variantId("sample-crew-neck-t-shirt", "S");
    await as(db, anon, (q) =>
      q(
        `insert into orders (order_number, items, subtotal, total, customer_name, phone,
           address, pincode, payment_preference, status, stock_applied)
         values ('HACK', $1::jsonb, 1, 1, 'Someone', '9876543210', 'Some address here', '140126',
           'upi', 'pending', true)`,
        [JSON.stringify([{ variant_id: tee, quantity: 1, unit_price: 1 }])],
      ),
    );
    const rows = await as(db, owner, (q) =>
      q<{ order_number: string; total: number; stock_applied: boolean }>(
        `select order_number, total, stock_applied from orders where customer_name = 'Someone'`,
      ),
    );
    expect(rows[0].order_number).toMatch(/^MBH-/);
    expect(rows[0].total).toBe(449 + 50);
    expect(rows[0].stock_applied).toBe(false);
  });

  it("refuses an order that starts as confirmed", async () => {
    const tee = await variantId("sample-crew-neck-t-shirt", "S");
    await expect(
      as(db, anon, (q) =>
        q(
          `insert into orders (order_number, items, subtotal, total, customer_name, phone,
             address, pincode, payment_preference, status)
           values ('', $1::jsonb, 0, 0, 'Someone', '9876543210', 'Some address here', '140126',
             'upi', 'confirmed')`,
          [JSON.stringify([{ variant_id: tee, quantity: 1 }])],
        ),
      ),
    ).resolves.toBeDefined(); // trigger forces it back to pending
    const rows = await as(db, owner, (q) =>
      q<{ status: string }>(`select distinct status from orders`),
    );
    expect(rows).toEqual([{ status: "pending" }]);
  });

  it("does not let the public or non-admins read orders", async () => {
    await expect(as(db, anon, (q) => q(`select * from orders`))).rejects.toThrow(/permission denied/);
    const rows = await as(db, shopper, (q) => q(`select * from orders`));
    expect(rows).toHaveLength(0);
    const adminRows = await as(db, admin, (q) => q(`select * from orders`));
    expect(adminRows.length).toBeGreaterThan(0);
  });

  it("rejects sold out, unpublished and hidden items", async () => {
    const soldOut = await variantId("sample-kids-track-pants", "6-7Y");
    await expect(placeOrder([{ variant_id: soldOut, quantity: 1 }])).rejects.toThrow(/Only 0 left/);
    const unpublished = await variantId("sample-sunglasses", "One size");
    await expect(placeOrder([{ variant_id: unpublished, quantity: 1 }])).rejects.toThrow(
      /no longer available/,
    );
    const hidden = await variantId("hidden-speaker", "One size");
    await expect(placeOrder([{ variant_id: hidden, quantity: 1 }])).rejects.toThrow(
      /no longer available/,
    );
  });

  it("validates phone and pincode", async () => {
    const tee = await variantId("sample-crew-neck-t-shirt", "L");
    const bad = (phone: string, pincode: string) =>
      as(db, anon, (q) =>
        q(`select place_order($1::jsonb, 'Test Customer', $2, 'House 1, Test Street', $3, 'upi')`, [
          JSON.stringify([{ variant_id: tee, quantity: 1 }]),
          phone,
          pincode,
        ]),
      );
    await expect(bad("12345", "140126")).rejects.toThrow(/orders_phone_check/);
    await expect(bad("5876543210", "140126")).rejects.toThrow(/orders_phone_check/);
    await expect(bad("9876543210", "040126")).rejects.toThrow(/orders_pincode_check/);
    await expect(bad("9876543210", "14012")).rejects.toThrow(/orders_pincode_check/);
  });
});

describe("stock on confirm and cancel", () => {
  it("does not touch stock when an order is placed", async () => {
    const id = await variantId("sample-canvas-sneakers", "UK 8");
    const before = await stockOf(id);
    await placeOrder([{ variant_id: id, quantity: 1 }]);
    expect(await stockOf(id)).toBe(before);
  });

  it("takes stock on confirm and puts it back on cancel", async () => {
    const id = await variantId("sample-flat-sandals", "UK 5");
    expect(await stockOf(id)).toBe(2);
    const order = await placeOrder([{ variant_id: id, quantity: 2 }]);

    const [confirmed] = await setStatus(order.order_number, "confirmed");
    expect(confirmed).toEqual({ status: "confirmed", stock_applied: true });
    expect(await stockOf(id)).toBe(0);

    await setStatus(order.order_number, "dispatched");
    expect(await stockOf(id)).toBe(0);

    const [cancelled] = await setStatus(order.order_number, "cancelled");
    expect(cancelled).toEqual({ status: "cancelled", stock_applied: false });
    expect(await stockOf(id)).toBe(2);
  });

  it("cancelling a pending order leaves stock alone", async () => {
    const id = await variantId("sample-flat-sandals", "UK 4");
    const order = await placeOrder([{ variant_id: id, quantity: 1 }]);
    await setStatus(order.order_number, "cancelled");
    expect(await stockOf(id)).toBe(1);
  });

  it("lets two customers request the last unit; only the first confirm succeeds", async () => {
    const id = await variantId("sample-hooded-sweatshirt", "M");
    expect(await stockOf(id)).toBe(1);
    const a = await placeOrder([{ variant_id: id, quantity: 1 }]);
    const b = await placeOrder([{ variant_id: id, quantity: 1 }]);

    await setStatus(a.order_number, "confirmed");
    expect(await stockOf(id)).toBe(0);
    await expect(setStatus(b.order_number, "confirmed")).rejects.toThrow(/Not enough stock/);
    expect(await stockOf(id)).toBe(0);

    // The admin cancels the second request instead.
    await setStatus(b.order_number, "cancelled");
    expect(await stockOf(id)).toBe(0);
  });

  it("rolls back every line if one line is short", async () => {
    const ok = await variantId("sample-running-shoes", "UK 9"); // stock 2
    const short = await variantId("sample-running-shoes", "UK 7"); // stock 1
    const order = await placeOrder([
      { variant_id: ok, quantity: 1 },
      { variant_id: short, quantity: 1 },
    ]);
    await as(db, admin, (q) => q(`update variants set stock = 0 where id = $1`, [short]));
    await expect(setStatus(order.order_number, "confirmed")).rejects.toThrow(/Not enough stock/);
    expect(await stockOf(ok)).toBe(2);
    await as(db, admin, (q) => q(`update variants set stock = 1 where id = $1`, [short]));
  });

  it("does not let totals or items be edited after placing", async () => {
    const id = await variantId("sample-leather-belt", "34");
    const order = await placeOrder([{ variant_id: id, quantity: 1 }]);
    await as(db, admin, (q) =>
      q(`update orders set total = 1, subtotal = 1, items = '[]'::jsonb where order_number = $1`, [
        order.order_number,
      ]),
    );
    const rows = await as(db, owner, (q) =>
      q<{ total: number; n: number }>(
        `select total, jsonb_array_length(items) as n from orders where order_number = $1`,
        [order.order_number],
      ),
    );
    expect(rows[0]).toEqual({ total: 499 + 50, n: 1 });
  });

  it("matches the TypeScript status rules for every pair", async () => {
    const id = await variantId("sample-analog-wrist-watch", "One size");
    // Paths that reach each status from a fresh order.
    const pathTo: Record<string, string[]> = {
      pending: [],
      confirmed: ["confirmed"],
      dispatched: ["confirmed", "dispatched"],
      delivered: ["confirmed", "dispatched", "delivered"],
      cancelled: ["cancelled"],
    };
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        if (from === to) continue;
        await as(db, admin, (q) => q(`update variants set stock = 5 where id = $1`, [id]));
        const order = await placeOrder([{ variant_id: id, quantity: 1 }]);
        for (const s of pathTo[from]) await setStatus(order.order_number, s);
        const attempt = setStatus(order.order_number, to);
        if (canTransition(from, to)) {
          await expect(attempt, `${from} -> ${to}`).resolves.toBeDefined();
        } else {
          await expect(attempt, `${from} -> ${to}`).rejects.toThrow(/Cannot change order/);
        }
      }
    }
  });
});
