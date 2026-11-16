import type { Condition } from "@/lib/catalog/conditions";
import type { OrderStatus } from "@/lib/orders/status";
import type { Gender, OrderItemSnapshot, PaymentPreference, ProductImage } from "@/lib/types";

export type AdminVariant = { id: string; size: string; colour: string; stock: number; sort_order: number };

export type AdminProduct = {
  id: string;
  title: string;
  slug: string;
  brand: string;
  category_id: string;
  category_name: string;
  category_visible: boolean;
  gender: Gender;
  condition: Condition;
  mrp: number;
  price: number;
  description: string;
  images: ProductImage[];
  is_published: boolean;
  is_sample: boolean;
  created_at: string;
  variants: AdminVariant[];
  total_stock: number;
};

export type AdminOrder = {
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
  created_at: string;
  confirmed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_visible: boolean;
  intro: string | null;
  sort_order: number;
  product_count: number;
};

export type AdminSummary = {
  pending_orders: number;
  confirmed_orders: number;
  products: number;
  published: number;
  sold_out: number;
  samples: number;
};
