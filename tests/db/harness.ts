import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..", "..");
const migrationsDir = join(root, "supabase", "migrations");

/** Fresh in-memory Postgres with Supabase stubs and every migration applied. */
export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(readFileSync(join(__dirname, "supabase-stubs.sql"), "utf8"));
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    try {
      await db.exec(readFileSync(join(migrationsDir, file), "utf8"));
    } catch (err) {
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
    }
  }
  return db;
}

type Who = { role: "anon" } | { role: "authenticated"; userId: string } | { role: "owner" };

/**
 * Run fn as a given API role inside a transaction that is rolled back when
 * rollback is true. Mirrors how PostgREST sets role and JWT claims.
 */
export async function as<T>(
  db: PGlite,
  who: Who,
  fn: (q: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    if (who.role !== "owner") {
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [
        who.role === "authenticated" ? who.userId : "",
      ]);
      await tx.exec(`set local role ${who.role}`);
    }
    const q = async <R,>(sql: string, params?: unknown[]) =>
      (await tx.query<R>(sql, params)).rows;
    return fn(q);
  });
}
