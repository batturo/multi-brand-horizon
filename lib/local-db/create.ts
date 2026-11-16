/**
 * In-memory Postgres (PGlite) with the real migrations applied. Used by the
 * tests and by the local preview (DEMO_CATALOG=samples). Never used in
 * production, where Supabase is the database.
 */
import type { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildSampleRows } from "../catalog/samples";

export const LOCAL_ADMIN_ID = "00000000-0000-4000-8000-0000000000ad";

export type Role = { role: "anon" } | { role: "authenticated"; userId: string } | { role: "owner" };
export type Query = <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>;

export async function createLocalDb(root: string, opts: { samples?: boolean } = {}): Promise<PGlite> {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  await db.exec(readFileSync(join(root, "supabase", "local", "stubs.sql"), "utf8"));
  const dir = join(root, "supabase", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await db.exec(readFileSync(join(dir, file), "utf8"));
    } catch (err) {
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
    }
  }
  await db.query(`insert into auth.users (id, email) values ($1, 'admin@preview.local')`, [LOCAL_ADMIN_ID]);
  await db.query(`insert into public.admin_users (user_id) values ($1)`, [LOCAL_ADMIN_ID]);
  if (opts.samples) await seedSamples(db);
  return db;
}

/** Fixed, UUID-shaped ids for preview data (kind 1 = category, 2 = product, 3 = variant). */
export const fixedId = (kind: number, n: number) => `00000000-0000-4000-900${kind}-${String(n).padStart(12, "0")}`;

/**
 * Sample products with fixed ids. Fixed ids matter: pages prerendered at
 * build time and the running server each create their own in-memory
 * database, and both must agree on ids (for example in a visitor's cart).
 */
export async function seedSamples(db: PGlite) {
  const cats = (await db.query<{ id: string; slug: string }>(`select id, slug from public.categories order by sort_order, slug`)).rows;
  for (const [i, c] of cats.entries()) {
    await db.query(`update public.categories set id = $1 where id = $2`, [fixedId(1, i + 1), c.id]);
  }
  const fixedCats = (await db.query<{ id: string; slug: string }>(`select id, slug from public.categories`)).rows;
  const rows = buildSampleRows(Object.fromEntries(fixedCats.map((c) => [c.slug, c.id])));
  for (const [i, { product, variants }] of rows.entries()) {
    const productId = fixedId(2, i + 1);
    await db.query(
      `insert into public.products (id, title, slug, brand, category_id, gender, condition, mrp, price,
         description, images, is_published, is_sample, created_at, published_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$14)`,
      [
        productId, product.title, product.slug, product.brand, product.category_id, product.gender, product.condition,
        product.mrp, product.price, product.description, JSON.stringify(product.images), product.is_published,
        product.is_sample, new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
      ],
    );
    for (const [j, v] of variants.entries()) {
      await db.query(
        `insert into public.variants (id, product_id, size, colour, stock, sort_order) values ($1,$2,$3,$4,$5,$6)`,
        [fixedId(3, (i + 1) * 100 + j + 1), productId, v.size, v.colour, v.stock, v.sort_order],
      );
    }
  }
}

/** Run fn as an API role in a transaction, the way PostgREST does. */
export async function asRole<T>(db: PGlite, who: Role, fn: (q: Query) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    if (who.role !== "owner") {
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [
        who.role === "authenticated" ? who.userId : "",
      ]);
      await tx.exec(`set local role ${who.role}`);
    }
    return fn(async (sql, params) => (await tx.query(sql, params)).rows as never);
  });
}

const IDENT = /^[a-z_][a-z0-9_]*$/;

/**
 * Call a database function with named arguments, like supabase.rpc().
 * Objects (and arrays of objects) are sent as JSON. Returns the result
 * (jsonb comes back parsed).
 */
export async function callRpc<T>(db: PGlite, who: Role, fn: string, args: Record<string, unknown>): Promise<T> {
  if (!IDENT.test(fn)) throw new Error("Bad function name");
  const names = Object.keys(args);
  for (const n of names) if (!IDENT.test(n)) throw new Error("Bad argument name");
  const params = names.map((n) => {
    const v = args[n];
    const isJson =
      (v !== null && typeof v === "object" && !Array.isArray(v)) ||
      (Array.isArray(v) && v.some((x) => x !== null && typeof x === "object"));
    return isJson ? JSON.stringify(v) : v;
  });
  const sql = `select public.${fn}(${names.map((n, i) => `${n} => $${i + 1}`).join(", ")}) as result`;
  const rows = await asRole(db, who, (q) => q<{ result: T }>(sql, params));
  return rows[0].result;
}
