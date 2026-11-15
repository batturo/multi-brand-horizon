import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Listing, ListingFallback } from "@/components/listing";
import { getCatalog, getCategoryBySlug, getCategoryProducts } from "@/lib/catalog/data";

export async function generateStaticParams() {
  const { categories } = await getCatalog();
  // Cache Components needs at least one entry; "_" renders a 404.
  return categories.length ? categories.map((c) => ({ slug: c.slug })) : [{ slug: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/c/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) return { title: "Not found" };
  return {
    title: `${cat.name}: open-box and surplus branded ${cat.name.toLowerCase()}`,
    description:
      cat.intro?.slice(0, 155) ??
      `Branded ${cat.name.toLowerCase()} at Multi Brand Horizon, Naya Nangal. Condition, MRP and price shown on every item.`,
    alternates: { canonical: `/c/${cat.slug}` },
  };
}

export default function CategoryPage(props: PageProps<"/c/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-6"><ListingFallback /></div>}>
      <CategoryContent {...props} />
    </Suspense>
  );
}

async function CategoryContent({ params, searchParams }: PageProps<"/c/[slug]">) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();
  const products = await getCategoryProducts(category.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex gap-2">
          <li>
            <Link href="/" className="underline underline-offset-4">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{category.name}</li>
        </ol>
      </nav>
      <h1 className="mt-2 text-2xl font-bold">{category.name}</h1>
      {category.intro && <p className="mt-2 max-w-prose leading-7 text-ink/85">{category.intro}</p>}
      <div className="mt-5">
        <Suspense fallback={<ListingFallback />}>
          <Listing
            products={products}
            searchParams={searchParams}
            basePath={`/c/${category.slug}`}
            emptyText="Nothing in this category right now. New stock comes in often."
          />
        </Suspense>
      </div>
    </div>
  );
}
