"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { adminErrorMessage, adminRpc } from "@/lib/admin/rpc";
import { requireAdmin } from "@/lib/admin/session";
import { validateProduct, type ProductErrors, type ProductInput } from "@/lib/admin/product-input";
import type { AdminProduct } from "@/lib/admin/types";
import { backendMode } from "@/lib/backend";
import { CATALOG_TAG } from "@/lib/catalog/data";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/catalog/images";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/orders/status";
import { createSessionClient } from "@/lib/supabase/server";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: ProductErrors };

/** Run an admin write, refresh the shop's cached catalogue, and report plainly. */
async function write<T>(fn: () => Promise<T>, refresh = true): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    if (refresh) updateTag(CATALOG_TAG);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
}

const isUuid = (s: unknown): s is string =>
  typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export async function saveProductAction(input: ProductInput): Promise<ActionResult<{ id: string; slug: string }>> {
  const checked = validateProduct(input);
  if (!checked.ok) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: checked.errors };
  return write(async () => {
    const p = await adminRpc<AdminProduct>("admin_save_product", { p: checked.payload });
    return { id: p.id, slug: p.slug };
  });
}

export async function duplicateProductAction(id: string): Promise<ActionResult<{ id: string }>> {
  if (!isUuid(id)) return { ok: false, error: "Product not found." };
  return write(async () => ({ id: (await adminRpc<AdminProduct>("admin_duplicate_product", { p_id: id })).id }));
}

export async function setStockAction(variantId: string, stock: number): Promise<ActionResult<number>> {
  if (!isUuid(variantId) || !Number.isInteger(stock)) return { ok: false, error: "Enter a whole number." };
  return write(() => adminRpc<number>("admin_set_stock", { p_variant_id: variantId, p_stock: stock }));
}

export async function markSoldAction(productId: string): Promise<ActionResult> {
  if (!isUuid(productId)) return { ok: false, error: "Product not found." };
  return write(async () => {
    await adminRpc("admin_mark_sold", { p_product_id: productId });
    return undefined;
  });
}

export async function setPublishedAction(ids: string[], published: boolean): Promise<ActionResult<number>> {
  const clean = (Array.isArray(ids) ? ids : []).filter(isUuid).slice(0, 500);
  if (clean.length === 0) return { ok: false, error: "Select at least one product." };
  return write(() => adminRpc<number>("admin_set_published", { p_ids: clean, p_published: Boolean(published) }));
}

export async function setOrderStatusAction(orderId: string, status: OrderStatus): Promise<ActionResult> {
  if (!isUuid(orderId) || !ORDER_STATUSES.includes(status)) return { ok: false, error: "Unknown order or status." };
  // Confirming or cancelling changes stock, so the shop pages refresh too.
  return write(async () => {
    await adminRpc("admin_set_order_status", { p_id: orderId, p_status: status });
    return undefined;
  });
}

export async function saveSettingsAction(banner: string, fee: string): Promise<ActionResult> {
  const f = fee.trim() === "" ? null : Number(fee.trim());
  if (f !== null && (!Number.isInteger(f) || f < 0 || f > 100000)) {
    return { ok: false, error: "Delivery fee must be a whole number of rupees, or empty." };
  }
  if (banner.length > 200) return { ok: false, error: "Sale banner is too long (200 characters max)." };
  return write(async () => {
    await adminRpc("admin_save_settings", { p_sale_banner_text: banner, p_delivery_fee: f });
    return undefined;
  });
}

export async function saveCategoryAction(id: string, visible: boolean, intro: string): Promise<ActionResult> {
  if (!isUuid(id)) return { ok: false, error: "Category not found." };
  if (intro.length > 2000) return { ok: false, error: "Intro text is too long." };
  return write(async () => {
    await adminRpc("admin_save_category", { p_id: id, p_is_visible: Boolean(visible), p_intro: intro });
    return undefined;
  });
}

const IMAGE_TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

/**
 * Store one product photo (already resized in the browser). Returns the src
 * to save on the product.
 */
export async function uploadImageAction(form: FormData): Promise<ActionResult<{ src: string }>> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: adminErrorMessage(e) };
  }
  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) return { ok: false, error: "No photo received." };
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { ok: false, error: "Photos must be JPEG, WebP or PNG." };
  if (file.size > 1024 * 1024) return { ok: false, error: "Photo is too large." };

  const now = new Date();
  const name = `${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (backendMode() === "local") {
    const { putPreviewImage } = await import("@/lib/admin/preview-images");
    putPreviewImage(name, bytes, file.type);
    return { ok: true, data: { src: `/preview-images/${name}` } };
  }

  const path = `products/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${name}`;
  const db = await createSessionClient();
  const { error } = await db.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, bytes, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("upload failed:", error.message);
    return { ok: false, error: "Upload failed. Check your internet and try again." };
  }
  return { ok: true, data: { src: path } };
}

export async function signOutAction() {
  if (backendMode() === "supabase") {
    const db = await createSessionClient();
    await db.auth.signOut();
  }
  redirect("/admin/login");
}
