import "server-only";

/** Photos uploaded in the local preview, kept in memory until restart. */
type G = typeof globalThis & { __mbhPreviewImages?: Map<string, { bytes: Uint8Array; type: string }> };

function store() {
  const g = globalThis as G;
  g.__mbhPreviewImages ??= new Map();
  return g.__mbhPreviewImages;
}

export function putPreviewImage(name: string, bytes: Uint8Array, type: string) {
  store().set(name, { bytes, type });
}

export function getPreviewImage(name: string) {
  return store().get(name) ?? null;
}
