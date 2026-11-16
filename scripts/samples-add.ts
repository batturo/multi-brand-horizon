// Adds the 12 sample products. Safe to run twice: existing samples are
// replaced. Usage: npm run samples:add
import { config } from "dotenv";
import { createServiceClient } from "../lib/supabase/service";
import { buildSampleRows } from "../lib/catalog/samples";

config({ path: ".env.local" });
config();

async function main() {
  const db = createServiceClient();

  const { data: cats, error: catErr } = await db.from("categories").select("id, slug");
  if (catErr) throw catErr;
  const ids = Object.fromEntries((cats ?? []).map((c) => [c.slug, c.id]));

  const { error: delErr } = await db.from("products").delete().eq("is_sample", true);
  if (delErr) throw delErr;

  for (const { product, variants } of buildSampleRows(ids)) {
    const { data, error } = await db.from("products").insert(product).select("id").single();
    if (error) throw new Error(`${product.slug}: ${error.message}`);
    const { error: vErr } = await db
      .from("variants")
      .insert(variants.map((v) => ({ ...v, product_id: data.id })));
    if (vErr) throw new Error(`${product.slug} variants: ${vErr.message}`);
    console.log(`added ${product.slug}`);
  }
  console.log("Done. Remove them before launch with: npm run samples:remove");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
