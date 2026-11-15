/**
 * Twelve obviously fake products so the pages can be reviewed before real
 * stock is entered. Every one has is_sample = true, "SAMPLE" in the title,
 * a made-up brand, and a placeholder photo. Remove them all with
 * `npm run samples:remove`.
 */
import type { Condition } from "../lib/catalog/conditions";
import type { Gender } from "../lib/types";

type SampleVariant = { size: string; colour: string; stock: number };

export type SampleProduct = {
  title: string;
  slug: string;
  brand: string;
  categorySlug: "apparel" | "footwear" | "accessories";
  gender: Gender;
  condition: Condition;
  mrp: number;
  price: number;
  published: boolean;
  variants: SampleVariant[];
};

const sizes = (list: string[], stock: number[], colour = "") =>
  list.map((size, i) => ({ size, colour, stock: stock[i] ?? 0 }));

export const SAMPLE_PRODUCTS: SampleProduct[] = [
  { title: "SAMPLE Crew Neck T-Shirt", slug: "sample-crew-neck-t-shirt", brand: "Sample Brand A", categorySlug: "apparel", gender: "men", condition: "new_with_tags", mrp: 999, price: 449, published: true, variants: sizes(["S", "M", "L", "XL"], [2, 3, 1, 0], "Black") },
  { title: "SAMPLE Slim Fit Jeans", slug: "sample-slim-fit-jeans", brand: "Sample Brand B", categorySlug: "apparel", gender: "men", condition: "open_box_like_new", mrp: 2499, price: 1199, published: true, variants: sizes(["30", "32", "34", "36"], [1, 2, 2, 1], "Blue") },
  { title: "SAMPLE Hooded Sweatshirt", slug: "sample-hooded-sweatshirt", brand: "Sample Brand C", categorySlug: "apparel", gender: "unisex", condition: "open_box_minor_marks", mrp: 1899, price: 699, published: true, variants: sizes(["M", "L"], [1, 1], "Grey") },
  { title: "SAMPLE Printed Kurti", slug: "sample-printed-kurti", brand: "Sample Brand D", categorySlug: "apparel", gender: "women", condition: "new_with_tags", mrp: 1299, price: 599, published: true, variants: sizes(["S", "M", "L"], [2, 2, 2], "Green") },
  { title: "SAMPLE Kids Track Pants", slug: "sample-kids-track-pants", brand: "Sample Brand A", categorySlug: "apparel", gender: "kids", condition: "new_with_tags", mrp: 799, price: 349, published: true, variants: sizes(["6-7Y", "8-9Y"], [0, 0], "Navy") },
  { title: "SAMPLE Running Shoes", slug: "sample-running-shoes", brand: "Sample Brand E", categorySlug: "footwear", gender: "men", condition: "open_box_like_new", mrp: 4999, price: 2299, published: true, variants: sizes(["UK 7", "UK 8", "UK 9", "UK 10"], [1, 1, 2, 0], "White") },
  { title: "SAMPLE Canvas Sneakers", slug: "sample-canvas-sneakers", brand: "Sample Brand F", categorySlug: "footwear", gender: "unisex", condition: "open_box_minor_marks", mrp: 2199, price: 899, published: true, variants: sizes(["UK 6", "UK 8"], [1, 1], "Off white") },
  { title: "SAMPLE Flat Sandals", slug: "sample-flat-sandals", brand: "Sample Brand B", categorySlug: "footwear", gender: "women", condition: "new_with_tags", mrp: 1499, price: 649, published: true, variants: sizes(["UK 4", "UK 5", "UK 6"], [1, 2, 1], "Tan") },
  { title: "SAMPLE Leather Belt", slug: "sample-leather-belt", brand: "Sample Brand C", categorySlug: "accessories", gender: "men", condition: "new_with_tags", mrp: 1199, price: 499, published: true, variants: sizes(["32", "34", "36"], [2, 2, 1], "Brown") },
  { title: "SAMPLE Analog Wrist Watch", slug: "sample-analog-wrist-watch", brand: "Sample Brand G", categorySlug: "accessories", gender: "unisex", condition: "open_box_like_new", mrp: 3499, price: 1499, published: true, variants: sizes(["One size"], [3], "Silver") },
  { title: "SAMPLE Backpack 25L", slug: "sample-backpack-25l", brand: "Sample Brand E", categorySlug: "accessories", gender: "unisex", condition: "open_box_minor_marks", mrp: 2799, price: 999, published: true, variants: sizes(["One size"], [2], "Black") },
  { title: "SAMPLE Sunglasses (unpublished)", slug: "sample-sunglasses", brand: "Sample Brand D", categorySlug: "accessories", gender: "unisex", condition: "new_with_tags", mrp: 1599, price: 699, published: false, variants: sizes(["One size"], [4], "Black") },
];

export const SAMPLE_DESCRIPTION =
  "SAMPLE PRODUCT for reviewing the website. Not a real item and not for sale.";

/** Rows ready to insert, given the id of each category by slug. */
export function buildSampleRows(categoryIdBySlug: Record<string, string>) {
  return SAMPLE_PRODUCTS.map((p, i) => {
    const categoryId = categoryIdBySlug[p.categorySlug];
    if (!categoryId) throw new Error(`Category "${p.categorySlug}" not found. Run the migrations first.`);
    const n = String(i + 1).padStart(2, "0");
    return {
      product: {
        title: p.title,
        slug: p.slug,
        brand: p.brand,
        category_id: categoryId,
        gender: p.gender,
        condition: p.condition,
        mrp: p.mrp,
        price: p.price,
        description: SAMPLE_DESCRIPTION,
        images: [{ src: `/samples/sample-${n}.svg`, alt: `Placeholder photo for ${p.title}`, width: 800, height: 1000 }],
        is_published: p.published,
        is_sample: true,
      },
      variants: p.variants.map((v, j) => ({ ...v, sort_order: j })),
    };
  });
}
