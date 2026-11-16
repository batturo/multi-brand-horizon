// Deletes every product marked is_sample (their variants go with them).
// Real products are never touched. Usage: npm run samples:remove
import { config } from "dotenv";
import { createServiceClient } from "../lib/supabase/service";

config({ path: ".env.local" });
config();

async function main() {
  const db = createServiceClient();
  const { data, error } = await db
    .from("products")
    .delete()
    .eq("is_sample", true)
    .select("slug");
  if (error) throw error;
  console.log(`Removed ${data?.length ?? 0} sample products.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
