import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Category } from "@/lib/types";

/** Cache tag for anything read from the catalogue. Admin edits revalidate it. */
export const CATALOG_TAG = "catalog";

/** Visible top-level categories, for navigation. Hidden ones never come back (RLS). */
export async function getNavCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  const db = createPublicClient();
  if (!db) return [];
  const { data, error } = await db
    .from("categories")
    .select("id, name, slug, parent_id, is_visible, intro, sort_order")
    .is("parent_id", null)
    .order("sort_order");
  if (error) {
    console.error("getNavCategories:", error.message);
    return [];
  }
  return data as Category[];
}
