import Link from "next/link";
import { ConditionBadge } from "@/components/condition-badge";
import { Price } from "@/components/price";
import { ProductImage } from "@/components/product-image";
import { imageAlt } from "@/lib/catalog/images";
import type { CatalogProduct } from "@/lib/catalog/model";

export function ProductCard({ product: p, eager = false }: { product: CatalogProduct; eager?: boolean }) {
  return (
    <article className="flex flex-col">
      <Link href={`/p/${p.slug}`} className="group flex flex-1 flex-col">
        <div className="relative overflow-hidden rounded border border-line">
          <ProductImage
            image={p.images[0]}
            alt={imageAlt(p.images[0], `${p.title} by ${p.brand}`)}
            sizes="(min-width: 1024px) 23vw, (min-width: 640px) 31vw, 48vw"
            eager={eager}
            className={p.soldOut ? "opacity-60" : ""}
          />
          {p.soldOut && (
            <span className="absolute left-2 top-2 rounded-sm bg-ink px-2 py-0.5 text-xs font-semibold text-white">
              Sold out
            </span>
          )}
        </div>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">{p.brand}</p>
        <h3 className="text-sm leading-snug group-hover:underline">{p.title}</h3>
        <div className="mt-1">
          <Price price={p.price} mrp={p.mrp} />
        </div>
        <div className="mt-1">
          <ConditionBadge condition={p.condition} />
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({ products, eagerFirst = 0 }: { products: CatalogProduct[]; eagerFirst?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} eager={i < eagerFirst} />
        </li>
      ))}
    </ul>
  );
}
