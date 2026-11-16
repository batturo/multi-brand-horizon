import type { Metadata } from "next";
import { Suspense } from "react";
import { Listing, ListingFallback } from "@/components/listing";
import { getCatalog } from "@/lib/catalog/data";

export const metadata: Metadata = {
  title: "Search",
  description: "Search open-box and surplus branded items at Multi Brand Horizon, Naya Nangal.",
  // Search result pages should not be indexed.
  robots: { index: false, follow: true },
};

async function Heading({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim();
  const brand = (Array.isArray(sp.brand) ? sp.brand : sp.brand ? [sp.brand] : []).join(", ");
  return (
    <h1 className="text-2xl font-bold">
      {q ? `Results for “${q.slice(0, 80)}”` : brand ? `Brand: ${brand.slice(0, 80)}` : "All items"}
    </h1>
  );
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { products } = await getCatalog();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Suspense fallback={<h1 className="text-2xl font-bold">Search</h1>}>
        <Heading searchParams={searchParams} />
      </Suspense>
      <div className="mt-5">
        <Suspense fallback={<ListingFallback />}>
          <Listing
            products={products}
            searchParams={searchParams}
            basePath="/search"
            emptyText="Nothing found. Try a brand name or a simpler word, or ask us on WhatsApp."
          />
        </Suspense>
      </div>
    </div>
  );
}
