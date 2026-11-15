import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BuyBox } from "@/components/buy-box";
import { ConditionBadge } from "@/components/condition-badge";
import { DeliverySummary } from "@/components/delivery-summary";
import { Price } from "@/components/price";
import { ProductGallery } from "@/components/product-gallery";
import { ProductGrid } from "@/components/product-card";
import { conditionNote } from "@/lib/catalog/conditions";
import { getCatalog, getProductBySlug } from "@/lib/catalog/data";
import { similarProducts } from "@/lib/catalog/filters";
import { productImageUrl } from "@/lib/catalog/images";
import { formatINR } from "@/lib/pricing";
import { absoluteUrl } from "@/lib/site";
import { whatsappNumber } from "@/lib/store-info";

// Product pages are fully static and refreshed when the catalogue changes.
// Products added after a deploy are rendered on their first visit and kept.
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const { products } = await getCatalog();
  // Cache Components needs at least one entry; "_" renders a 404.
  return products.length ? products.map((p) => ({ slug: p.slug })) : [{ slug: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Not found" };
  const state = p.soldOut ? "Sold out. " : "";
  return {
    title: `${p.title} by ${p.brand}, ${formatINR(p.price)}`,
    description: `${state}${p.brand} ${p.title} for ${formatINR(p.price)} (MRP ${formatINR(p.mrp)}). At Multi Brand Horizon, Naya Nangal.`.slice(
      0,
      160,
    ),
    alternates: { canonical: `/p/${p.slug}` },
  };
}

export default function ProductPage(props: PageProps<"/p/[slug]">) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-10 text-muted">Loading item…</p>}>
      <ProductContent {...props} />
    </Suspense>
  );
}

async function ProductContent({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  const { products, settings } = await getCatalog();
  const similar = similarProducts(p, products, 4);
  const note = conditionNote(p.condition);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link href="/" className="underline underline-offset-4">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/c/${p.categorySlug}`} className="underline underline-offset-4">
              {p.categoryName}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">
            {p.title}
          </li>
        </ol>
      </nav>

      <div className="mt-4 grid gap-6 md:grid-cols-2 md:gap-10">
        <ProductGallery images={p.images} title={`${p.title} by ${p.brand}`} />

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">{p.brand}</p>
            <h1 className="text-2xl font-bold leading-tight">{p.title}</h1>
          </div>
          {p.soldOut && (
            <p className="rounded border-2 border-ink px-4 py-3 font-semibold">
              Sold out. Similar items are listed below.
            </p>
          )}
          <Price price={p.price} mrp={p.mrp} size="lg" />
          <p className="text-sm text-muted">Price includes taxes.</p>
          <div>
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">Condition:</span>
              <ConditionBadge condition={p.condition} />
            </p>
            {note && <p className="mt-1 text-sm">{note}</p>}
          </div>

          <BuyBox
            product={{ id: p.id, slug: p.slug, title: p.title, brand: p.brand, price: p.price, mrp: p.mrp }}
            variants={p.variants}
            url={absoluteUrl(`/p/${p.slug}`)}
            whatsappNumber={whatsappNumber()}
            image={p.images[0] ? productImageUrl(p.images[0].src) : null}
          />

          {p.description && (
            <section aria-labelledby="about-item">
              <h2 id="about-item" className="font-semibold">
                About this item
              </h2>
              <p className="mt-1 whitespace-pre-line leading-7">{p.description}</p>
            </section>
          )}

          <DeliverySummary deliveryFee={settings.delivery_fee} />
        </div>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby="similar" className="mt-12">
          <h2 id="similar" className="text-xl font-bold">
            Similar items
          </h2>
          <div className="mt-4">
            <ProductGrid products={similar} />
          </div>
        </section>
      )}
    </div>
  );
}
