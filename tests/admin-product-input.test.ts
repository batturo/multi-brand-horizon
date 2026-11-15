import { describe, expect, it } from "vitest";
import { fitWithin } from "@/lib/admin/image-resize";
import { parseRupees, validateProduct, type ProductInput } from "@/lib/admin/product-input";

const CAT = "00000000-0000-4000-8000-000000000001";
const base: ProductInput = {
  title: "  Polo   T-Shirt ",
  brand: " Test Brand ",
  category_id: CAT,
  gender: "men",
  condition: "new_with_tags",
  mrp: "1,299",
  price: "₹599",
  description: "",
  images: [{ src: "products/a.webp", alt: "" }],
  is_published: true,
  variants: [
    { size: "M", colour: "", stock: "2" },
    { size: "", colour: "", stock: "" }, // empty row is ignored
    { size: "L", colour: "Blue", stock: 1 },
  ],
};

describe("validateProduct", () => {
  it("cleans input and fills alt text", () => {
    const r = validateProduct(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload).toMatchObject({
      title: "Polo T-Shirt",
      brand: "Test Brand",
      mrp: 1299,
      price: 599,
      variants: [
        { size: "M", colour: "", stock: 2 },
        { size: "L", colour: "Blue", stock: 1 },
      ],
    });
    expect(r.payload.images[0].alt).toBe("Polo T-Shirt by Test Brand");
  });

  it("rejects price above MRP", () => {
    const r = validateProduct({ ...base, price: "1300" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.price).toBe("Price cannot be more than MRP");
  });

  it("needs a photo to publish, but not for a draft", () => {
    expect(validateProduct({ ...base, images: [] }).ok).toBe(false);
    expect(validateProduct({ ...base, images: [], is_published: false }).ok).toBe(true);
  });

  it("needs at least one size and no duplicates", () => {
    const none = validateProduct({ ...base, variants: [{ size: "", colour: "", stock: "" }] });
    expect(none.ok === false && none.errors.variants).toMatch(/at least one size/);
    const dup = validateProduct({
      ...base,
      variants: [
        { size: "M", colour: "", stock: 1 },
        { size: "m", colour: "", stock: 2 },
      ],
    });
    expect(dup.ok === false && dup.errors.variants).toMatch(/listed twice/);
  });

  it("rejects bad stock", () => {
    const r = validateProduct({ ...base, variants: [{ size: "M", colour: "", stock: "-1" }] });
    expect(r.ok === false && r.errors.variants).toMatch(/0 or more/);
    const r2 = validateProduct({ ...base, variants: [{ size: "M", colour: "", stock: "1.5" }] });
    expect(r2.ok).toBe(false);
  });

  it("reports all missing fields", () => {
    const r = validateProduct({ ...base, title: "", brand: "", category_id: "", gender: "", condition: "", mrp: "", price: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["brand", "category_id", "condition", "gender", "mrp", "price", "title"]);
  });
});

describe("parseRupees and fitWithin", () => {
  it("parses rupee amounts", () => {
    expect(parseRupees("1,23,456")).toBe(123456);
    expect(parseRupees("12.5")).toBeNaN();
    expect(parseRupees("")).toBeNaN();
  });
  it("shrinks photos without upscaling", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
