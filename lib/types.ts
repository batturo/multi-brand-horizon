import type { Condition } from "@/lib/catalog/conditions";
import type { OrderStatus } from "@/lib/orders/status";

export type Gender = "men" | "women" | "unisex" | "kids";
export type PaymentPreference = "cod" | "upi";

export type ProductImage = {
  /** Path in the product-images bucket, or a site path starting with "/". */
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_visible: boolean;
  intro: string | null;
  sort_order: number;
};

export type Product = {
  id: string;
  title: string;
  slug: string;
  brand: string;
  category_id: string;
  gender: Gender;
  condition: Condition;
  mrp: number;
  price: number;
  description: string;
  images: ProductImage[];
  is_published: boolean;
  is_sample: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Variant = {
  id: string;
  product_id: string;
  size: string;
  colour: string;
  stock: number;
  sort_order: number;
};

export type Settings = {
  sale_banner_text: string | null;
  delivery_fee: number | null;
};

export type OrderItemSnapshot = {
  product_id: string;
  variant_id: string;
  title: string;
  brand: string;
  slug: string;
  condition: Condition;
  size: string;
  colour: string;
  mrp: number;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type Order = {
  id: string;
  order_number: string;
  items: OrderItemSnapshot[];
  subtotal: number;
  delivery_fee: number | null;
  total: number;
  customer_name: string;
  phone: string;
  address: string;
  pincode: string;
  payment_preference: PaymentPreference;
  status: OrderStatus;
  stock_applied: boolean;
  admin_note: string | null;
  created_at: string;
};
