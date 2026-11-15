import Link from "next/link";
import { store } from "@/config/store";
import { ProductGrid } from "@/components/product-card";
import { StoreLocation } from "@/components/store-location";
import { getCatalog } from "@/lib/catalog/data";
import { sortProducts } from "@/lib/catalog/filters";

export default async function HomePage() {
  const { categories, products, settings } = await getCatalog();
  const topCategories = categories.filter((c) => c.parent_id === null);
  const newArrivals = sortProducts(
    products.filter((p) => !p.soldOut),
    "newest",
  ).slice(0, 8);

  const brandCounts = new Map<string, { name: string; count: number }>();
  for (const p of products) {
    if (p.soldOut) continue;
    const b = brandCounts.get(p.brand.toLowerCase()) ?? { name: p.brand, count: 0 };
    b.count++;
    brandCounts.set(p.brand.toLowerCase(), b);
  }
  const brands = [...brandCounts.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      {settings.sale_banner_text && (
        <p className="bg-gold px-4 py-2 text-center text-sm font-semibold text-ink">{settings.sale_banner_text}</p>
      )}

      <section className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="text-2xl font-bold sm:text-3xl">{store.name}</h1>
          <p className="mt-1 text-gold">{store.tagline}</p>
          <p className="mt-3 max-w-prose text-white/85">
            Open-box and surplus branded apparel, footwear and accessories in Naya Nangal. Every item shows its
            condition, MRP and our price.
          </p>
        </div>
      </section>

      {topCategories.length > 0 && (
        <section aria-labelledby="shop-by-category" className="mx-auto max-w-6xl px-4 py-8">
          <h2 id="shop-by-category" className="text-xl font-bold">
            Shop by category
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {topCategories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/c/${c.slug}`}
                  className="flex h-20 items-center justify-center rounded bg-ink px-3 text-center font-semibold text-white hover:text-gold"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="new-arrivals" className="mx-auto max-w-6xl px-4 py-8">
        <h2 id="new-arrivals" className="text-xl font-bold">
          New arrivals
        </h2>
        {newArrivals.length > 0 ? (
          <div className="mt-4">
            <ProductGrid products={newArrivals} eagerFirst={2} />
          </div>
        ) : (
          <p className="mt-3 text-muted">New stock is being added. Visit the shop or call us to ask what is in.</p>
        )}
      </section>

      {brands.length > 0 && (
        <section aria-labelledby="shop-by-brand" className="mx-auto max-w-6xl px-4 py-8">
          <h2 id="shop-by-brand" className="text-xl font-bold">
            Shop by brand
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {brands.map((b) => (
              <li key={b.name}>
                <Link
                  href={`/search?brand=${encodeURIComponent(b.name)}`}
                  className="inline-block rounded border border-line px-3 py-2 text-sm hover:border-ink"
                >
                  {b.name} <span className="text-muted">({b.count})</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="visit-us" className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h2 id="visit-us" className="mb-6 text-xl font-bold">
            Visit the store in Naya Nangal
          </h2>
          <StoreLocation headingLevel={3} />
          <Link href="/visit" className="mt-6 inline-block underline underline-offset-4 hover:text-gold">
            Directions and details
          </Link>
        </div>
      </section>
    </>
  );
}
