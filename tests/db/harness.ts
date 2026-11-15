import type { PGlite } from "@electric-sql/pglite";
import { join } from "node:path";
import { asRole, createLocalDb, type Query, type Role } from "@/lib/local-db/create";

const root = join(__dirname, "..", "..");

/** Fresh in-memory Postgres with Supabase stubs and every migration applied. */
export function createTestDb(opts: { samples?: boolean } = {}): Promise<PGlite> {
  return createLocalDb(root, opts);
}

export function as<T>(db: PGlite, who: Role, fn: (q: Query) => Promise<T>): Promise<T> {
  return asRole(db, who, fn);
}
