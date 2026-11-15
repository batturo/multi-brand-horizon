import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { buildSampleRows } from "@/lib/catalog/samples";
import { orderWhatsappMessage } from "@/lib/orders/message";
import { cleanItems, friendlyOrderError, submitOrder, type PlaceOrderRpc } from "@/lib/orders/place";
import { as, createTestDb } from "./harness";

let db: PGlite;
let rpc: PlaceOrderRpc;

const customer = {
  name: "Test Customer",
  phone: "98765 43210",
  address: "House 1, Test Street, Naya Nangal",
  pincode: "140126",
  payment: "cod",
};

async function variant(slug: string, size: string) {
  const r = await as(db, { role: "owner" }, (q) =>
    q<{ id: string; stock: number }>(
      `select v.id, v.stock from variants v join products p on p.id = v.product_id where p.slug = $1 and v.size = $2`,
      [slug, size],
    ),
  );
  return r[0];
}

beforeAll(async () => {
  db = await createTestDb();
  await as(db, { role: "owner" }, async (q) => {
    const cats = await q<{ id: string; slug: string }>(`select id, slug from categories`);
    for (const { product, variants } of buildSampleRows(Object.fromEntries(cats.map((c) => [c.slug, c.id])))) {
      const [p] = await q<{ id: string }>(
        `insert into products (title, slug, brand, category_id, gender, condition, mrp, price, images, is_published, is_sample)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,true) returning id`,
        [product.title, product.slug, product.brand, product.category_id, product.gender, product.condition,
         product.mrp, product.price, JSON.stringify(product.images), product.is_published],
      );
      for (const v of variants) {
        await q(`insert into variants (product_id, size, colour, stock) values ($1,$2,$3,$4)`, [p.id, v.size, v.colour, v.stock]);
      }
    }
  });
  // Same call shape as supabase.rpc("place_order", args), run as the anon role.
  rpc = async (args) => {
    try {
      const rows = await as(db, { role: "anon" }, (q) =>
        q<{ o: unknown }>(`select place_order($1::jsonb, $2, $3, $4, $5, $6) as o`, [
          JSON.stringify(args.p_items), args.p_customer_name, args.p_phone, args.p_address, args.p_pincode,
          args.p_payment_preference,
        ]),
      );
      return { data: rows[0].o, error: null };
    } catch (e) {
      const err = e as { message: string; code?: string };
      return { data: null, error: { message: err.message, code: err.code } };
    }
  };
});

describe("submitOrder against the real database function", () => {
  it("saves a pending order and builds the WhatsApp message from the saved data", async () => {
    const tee = await variant("sample-crew-neck-t-shirt", "M");
    const res = await submitOrder(customer, [{ variant_id: tee.id, quantity: 2 }], rpc);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.order.order_number).toMatch(/^MBH-\d+$/);
    expect(res.order.total).toBe(898);
    expect(res.order.phone).toBe("9876543210");
    const msg = orderWhatsappMessage(res.order);
    expect(msg).toContain(res.order.order_number);
    expect(msg).toContain("Size M, Black. Qty 2 x ₹449 = ₹898");
    expect(msg).toContain("Address: House 1, Test Street, Naya Nangal");

    const saved = await as(db, { role: "owner" }, (q) =>
      q<{ status: string }>(`select status from orders where order_number = $1`, [res.order.order_number]),
    );
    expect(saved[0].status).toBe("pending");
    expect((await variant("sample-crew-neck-t-shirt", "M")).stock).toBe(tee.stock); // not reduced yet
  });

  it("gives a clear message when asking for more than is in stock", async () => {
    const hoodie = await variant("sample-hooded-sweatshirt", "M"); // stock 1
    const res = await submitOrder(customer, [{ variant_id: hoodie.id, quantity: 2 }], rpc);
    expect(res).toEqual({
      ok: false,
      formError: "Only 1 left of SAMPLE Hooded Sweatshirt M. Please go back to your cart and lower the quantity.",
    });
  });

  it("refuses unpublished items", async () => {
    const sunglasses = await variant("sample-sunglasses", "One size");
    const res = await submitOrder(customer, [{ variant_id: sunglasses.id, quantity: 1 }], rpc);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.formError).toMatch(/no longer available/);
  });

  it("does not call the database when the form is invalid", async () => {
    let called = false;
    const res = await submitOrder({ ...customer, phone: "12345" }, [], async () => {
      called = true;
      return { data: null, error: null };
    });
    expect(called).toBe(false);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.phone).toBeDefined();
  });
});

describe("cleanItems", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  it("merges duplicates and ignores any price sent by the browser", () => {
    expect(cleanItems([{ variant_id: id, quantity: 1, price: 1 }, { variant_id: id.toUpperCase(), quantity: 2 }])).toEqual([
      { variant_id: id, quantity: 3 },
    ]);
  });
  it("rejects junk", () => {
    expect(cleanItems([])).toBeNull();
    expect(cleanItems("x")).toBeNull();
    expect(cleanItems([{ variant_id: "abc", quantity: 1 }])).toBeNull();
    expect(cleanItems([{ variant_id: id, quantity: 0 }])).toBeNull();
    expect(cleanItems([{ variant_id: id, quantity: 1.5 }])).toBeNull();
  });
});

describe("friendlyOrderError", () => {
  it("never shows raw database errors", () => {
    expect(friendlyOrderError({ message: 'new row violates check constraint "orders_phone_check"', code: "23514" })).toBe(
      "Sorry, we could not save your order. Please try again, or call us.",
    );
  });
});
