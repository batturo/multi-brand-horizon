import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";
import Link from "next/link";
import { store } from "@/config/store";
import { CartCount } from "@/components/cart-count";
import { getNavCategories } from "@/lib/catalog/data";

// The logo is used once public/logo.png is added; until then the name shows.
const hasLogo = existsSync(join(process.cwd(), "public", "logo.png"));

export async function SiteHeader() {
  const categories = await getNavCategories();
  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pt-3">
        <Link href="/" className="mr-auto flex items-center text-lg font-bold tracking-tight text-gold">
          {hasLogo ? (
            <Image src="/logo.png" alt={store.name} width={160} height={40} className="h-9 w-auto" preload />
          ) : (
            store.name
          )}
        </Link>
        <Link href="/cart" className="rounded px-2 py-2 text-sm font-semibold hover:text-gold">
          <CartCount />
        </Link>
      </div>
      <div className="mx-auto max-w-6xl px-4 pt-2">
        <form action="/search" method="get" role="search" className="flex">
          <label htmlFor="site-search" className="sr-only">
            Search products
          </label>
          <input
            id="site-search"
            name="q"
            type="search"
            placeholder="Search brand or item"
            className="min-w-0 flex-1 rounded-l bg-white px-3 py-2 text-ink placeholder:text-muted"
          />
          <button type="submit" className="rounded-r bg-gold px-4 font-semibold text-ink hover:bg-white">
            Search
          </button>
        </form>
      </div>
      {categories.length > 0 && (
        <nav aria-label="Categories" className="mx-auto max-w-6xl px-4">
          <ul className="flex gap-x-5 overflow-x-auto whitespace-nowrap py-2 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link className="inline-block py-2 hover:text-gold" href={`/c/${c.slug}`}>
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link className="inline-block py-2 hover:text-gold" href="/visit">
                Visit the store
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
