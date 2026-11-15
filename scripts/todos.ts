// Lists business facts still marked TODO in config/store.ts.
import { listStoreTodos } from "../lib/store-todos";

const todos = listStoreTodos();
if (todos.length === 0) {
  console.log("No open TODOs in config/store.ts.");
} else {
  console.log(`${todos.length} open TODOs in config/store.ts:`);
  for (const t of todos) console.log(`  - ${t}`);
  console.log("\nAlso set in the admin once it exists: delivery fee, sale banner, category intro text.");
}
