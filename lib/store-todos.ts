import { conditionNotes, store } from "@/config/store";

/** Every config/store.ts field still set to TODO, as dotted paths. */
export function listStoreTodos(): string[] {
  const out: string[] = [];
  const walk = (value: unknown, path: string) => {
    if (value === null) {
      out.push(path);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(store, "store");
  walk(conditionNotes, "conditionNotes");
  return out;
}
