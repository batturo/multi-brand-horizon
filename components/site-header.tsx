import Link from "next/link";
import { store } from "@/config/store";
import { getNavCategories } from "@/lib/catalog/queries";

export async function SiteHeader() {
  const categories = await getNavCategories();
  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-gold">
          {store.name}
        </Link>
        {categories.length > 0 && (
          <nav aria-label="Categories">
            <ul className="flex flex-wrap gap-x-4 text-sm">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link className="py-2 hover:text-gold" href={`/c/${c.slug}`}>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
