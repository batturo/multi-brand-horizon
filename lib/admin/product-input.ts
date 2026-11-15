import { isCondition, type Condition } from "@/lib/catalog/conditions";
import { validatePrices } from "@/lib/pricing";
import type { Gender, ProductImage } from "@/lib/types";

export const GENDERS: { value: Gender; label: string }[] = [
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "unisex", label: "Unisex" },
  { value: "kids", label: "Kids" },
];

export const MAX_IMAGES = 8;

export type VariantInput = { id?: string; size: string; colour: string; stock: string | number };

export type ProductInput = {
  id?: string;
  title: string;
  brand: string;
  category_id: string;
  gender: string;
  condition: string;
  mrp: string | number;
  price: string | number;
  description: string;
  images: ProductImage[];
  is_published: boolean;
  variants: VariantInput[];
};

export type ProductPayload = {
  id?: string;
  title: string;
  brand: string;
  category_id: string;
  gender: Gender;
  condition: Condition;
  mrp: number;
  price: number;
  description: string;
  images: ProductImage[];
  is_published: boolean;
  variants: { id?: string; size: string; colour: string; stock: number }[];
};

export type ProductErrors = Partial<Record<"title" | "brand" | "category_id" | "gender" | "condition" | "mrp" | "price" | "images" | "variants" | "description", string>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "1,299" or " 1299 " -> 1299; anything else -> NaN. */
export function parseRupees(v: string | number): number {
  if (typeof v === "number") return v;
  const s = v.replace(/[₹,\s]/g, "");
  return /^\d{1,7}$/.test(s) ? Number(s) : Number.NaN;
}

export function validateProduct(input: ProductInput): { ok: true; payload: ProductPayload } | { ok: false; errors: ProductErrors } {
  const errors: ProductErrors = {};
  const title = input.title.trim().replace(/\s+/g, " ");
  const brand = input.brand.trim().replace(/\s+/g, " ");
  const mrp = parseRupees(input.mrp);
  const price = parseRupees(input.price);

  if (!title) errors.title = "Enter a title.";
  else if (title.length > 160) errors.title = "Title is too long (160 characters max).";
  if (!brand) errors.brand = "Enter the brand.";
  else if (brand.length > 80) errors.brand = "Brand is too long.";
  if (!UUID.test(input.category_id)) errors.category_id = "Choose a category.";
  if (!GENDERS.some((g) => g.value === input.gender)) errors.gender = "Choose who it is for.";
  if (!isCondition(input.condition)) errors.condition = "Choose the condition.";

  if (Number.isNaN(mrp)) errors.mrp = "Enter MRP in rupees, numbers only.";
  if (Number.isNaN(price)) errors.price = "Enter price in rupees, numbers only.";
  if (!errors.mrp && !errors.price) {
    const check = validatePrices(mrp, price);
    if (!check.ok) errors.price = check.error;
  }
  if (input.description.length > 5000) errors.description = "Description is too long.";

  const images = input.images.filter((i) => i && typeof i.src === "string" && i.src);
  if (images.length > MAX_IMAGES) errors.images = `At most ${MAX_IMAGES} photos.`;
  if (input.is_published && images.length === 0) errors.images = "Add at least one photo before publishing.";

  const variants: ProductPayload["variants"] = [];
  const seen = new Set<string>();
  for (const v of input.variants) {
    const size = v.size.trim();
    const colour = v.colour.trim();
    const stockRaw = typeof v.stock === "number" ? v.stock : v.stock.trim() === "" ? 0 : Number(v.stock.trim());
    if (!size && !colour && (stockRaw === 0 || Number.isNaN(stockRaw))) continue; // empty row
    if (!Number.isInteger(stockRaw) || stockRaw < 0 || stockRaw > 10000) {
      errors.variants = `Stock for ${size || "a size"} must be a whole number, 0 or more.`;
      break;
    }
    if (size.length > 30 || colour.length > 40) {
      errors.variants = "Size or colour is too long.";
      break;
    }
    const key = `${size.toLowerCase()}|${colour.toLowerCase()}`;
    if (seen.has(key)) {
      errors.variants = `${[size, colour].filter(Boolean).join(" / ") || "One size"} is listed twice.`;
      break;
    }
    seen.add(key);
    variants.push({ ...(v.id && UUID.test(v.id) ? { id: v.id } : {}), size, colour, stock: stockRaw });
  }
  if (!errors.variants && variants.length === 0) errors.variants = "Add at least one size with its quantity.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    payload: {
      ...(input.id && UUID.test(input.id) ? { id: input.id } : {}),
      title,
      brand,
      category_id: input.category_id,
      gender: input.gender as Gender,
      condition: input.condition as Condition,
      mrp,
      price,
      description: input.description.trim(),
      images: images.map((i, n) => ({
        src: i.src,
        alt: i.alt?.trim() || `${title} by ${brand}${images.length > 1 ? `, photo ${n + 1}` : ""}`,
        ...(i.width ? { width: i.width } : {}),
        ...(i.height ? { height: i.height } : {}),
      })),
      is_published: input.is_published,
      variants,
    },
  };
}

/** Quick size sets for the add-product screen. */
export const SIZE_PRESETS: { label: string; sizes: string[] }[] = [
  { label: "S to XL", sizes: ["S", "M", "L", "XL"] },
  { label: "XS to XXL", sizes: ["XS", "S", "M", "L", "XL", "XXL"] },
  { label: "Waist 28 to 36", sizes: ["28", "30", "32", "34", "36"] },
  { label: "UK 6 to 11", sizes: ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"] },
  { label: "UK 3 to 8", sizes: ["UK 3", "UK 4", "UK 5", "UK 6", "UK 7", "UK 8"] },
  { label: "One size", sizes: ["One size"] },
];
