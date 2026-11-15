import Link from "next/link";
import { ProductGrid } from "@/components/product-card";
import { CONDITION_LABELS } from "@/lib/catalog/conditions";
import {
  SORTS,
  applyFilters,
  facets,
  filtersToQuery,
  hasActiveFilters,
  paginate,
  parseFilters,
  sortProducts,
  type Facets,
  type Filters,
  type RawSearchParams,
} from "@/lib/catalog/filters";
import type { CatalogProduct } from "@/lib/catalog/model";
import { formatINR } from "@/lib/pricing";

/**
 * Filterable, sortable product list. Filter state lives in the URL and the
 * form submits with GET, so it works without JavaScript.
 */
export async function Listing({
  products,
  searchParams,
  basePath,
  emptyText,
}: {
  products: CatalogProduct[];
  searchParams: Promise<RawSearchParams>;
  basePath: string;
  emptyText: string;
}) {
  const f = parseFilters(await searchParams);
  const scope = f.q ? applyFilters(products, { ...f, brands: [], sizes: [], conditions: [], min: null, max: null }) : products;
  const options = facets(scope);
  const matched = sortProducts(applyFilters(scope, f), f.sort);
  const { items, page, pages, total } = paginate(matched, f.page);

  return (
    <div>
      <h2 className="sr-only">Items</h2>
      <FiltersForm f={f} options={options} basePath={basePath} />
      <ActiveFilters f={f} basePath={basePath} />
      <p className="mt-4 text-sm text-muted" role="status">
        {total === 1 ? "1 item" : `${total} items`}
      </p>
      {items.length > 0 ? (
        <div className="mt-3">
          <ProductGrid products={items} eagerFirst={page === 1 ? 2 : 0} />
        </div>
      ) : (
        <p className="mt-6">{hasActiveFilters(f) ? "Nothing matches these filters. Try removing one." : emptyText}</p>
      )}
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-8 flex items-center justify-center gap-4">
          {page > 1 ? (
            <Link className="rounded border border-line px-4 py-2" href={`${basePath}${filtersToQuery({ ...f, page: page - 1 })}`}>
              Previous
            </Link>
          ) : null}
          <span className="text-sm">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link className="rounded border border-line px-4 py-2" href={`${basePath}${filtersToQuery({ ...f, page: page + 1 })}`}>
              Next
            </Link>
          ) : null}
        </nav>
      )}
    </div>
  );
}

function FiltersForm({ f, options, basePath }: { f: Filters; options: Facets; basePath: string }) {
  const open = hasActiveFilters(f);
  return (
    <details className="rounded border border-line" open={open}>
      <summary className="cursor-pointer select-none px-4 py-3 font-semibold">Filter and sort</summary>
      <form action={basePath} method="get" className="grid gap-5 border-t border-line px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
        {f.q && <input type="hidden" name="q" value={f.q} />}

        <div>
          <label htmlFor="sort" className="block font-semibold">
            Sort
          </label>
          <select id="sort" name="sort" defaultValue={f.sort} className="mt-1 w-full rounded border border-line bg-white px-2 py-2">
            {Object.entries(SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <fieldset className="mt-4">
            <legend className="font-semibold">Price (₹)</legend>
            <div className="mt-1 flex items-center gap-2">
              <label className="sr-only" htmlFor="min">
                Minimum price
              </label>
              <input
                id="min"
                name="min"
                inputMode="numeric"
                pattern="[0-9]*"
                defaultValue={f.min ?? ""}
                placeholder={options.priceMin != null ? String(options.priceMin) : "Min"}
                className="w-full rounded border border-line px-2 py-2"
              />
              <span aria-hidden="true">to</span>
              <label className="sr-only" htmlFor="max">
                Maximum price
              </label>
              <input
                id="max"
                name="max"
                inputMode="numeric"
                pattern="[0-9]*"
                defaultValue={f.max ?? ""}
                placeholder={options.priceMax != null ? String(options.priceMax) : "Max"}
                className="w-full rounded border border-line px-2 py-2"
              />
            </div>
          </fieldset>
        </div>

        {options.brands.length > 0 && (
          <fieldset>
            <legend className="font-semibold">Brand</legend>
            <ul className="mt-1 max-h-56 space-y-1 overflow-y-auto">
              {options.brands.map((b) => (
                <li key={b.name}>
                  <label className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      name="brand"
                      value={b.name}
                      defaultChecked={f.brands.some((x) => x.toLowerCase() === b.name.toLowerCase())}
                      className="size-5 accent-ink"
                    />
                    {b.name} <span className="text-muted">({b.count})</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        {options.sizes.length > 0 && (
          <fieldset>
            <legend className="font-semibold">Size in stock</legend>
            <ul className="mt-1 flex flex-wrap gap-2">
              {options.sizes.map((s) => (
                <li key={s}>
                  <label className="flex items-center gap-1.5 rounded border border-line px-2 py-1.5">
                    <input
                      type="checkbox"
                      name="size"
                      value={s}
                      defaultChecked={f.sizes.includes(s)}
                      className="size-4 accent-ink"
                    />
                    {s}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        {options.conditions.length > 0 && (
          <fieldset>
            <legend className="font-semibold">Condition</legend>
            <ul className="mt-1 space-y-1">
              {options.conditions.map((c) => (
                <li key={c.value}>
                  <label className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      name="condition"
                      value={c.value}
                      defaultChecked={f.conditions.includes(c.value)}
                      className="size-5 accent-ink"
                    />
                    {CONDITION_LABELS[c.value]} <span className="text-muted">({c.count})</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="rounded bg-ink px-5 py-2.5 font-semibold text-white hover:bg-ink-soft">
            Apply
          </button>
          {(open || f.sort !== "newest") && (
            <Link href={`${basePath}${filtersToQuery({ q: f.q })}`} className="underline underline-offset-4">
              Clear all
            </Link>
          )}
        </div>
      </form>
    </details>
  );
}

function ActiveFilters({ f, basePath }: { f: Filters; basePath: string }) {
  const chips: { label: string; href: string }[] = [];
  const without = (patch: Partial<Filters>) => `${basePath}${filtersToQuery({ ...f, ...patch, page: 1 })}`;
  for (const b of f.brands) chips.push({ label: b, href: without({ brands: f.brands.filter((x) => x !== b) }) });
  for (const s of f.sizes) chips.push({ label: `Size ${s}`, href: without({ sizes: f.sizes.filter((x) => x !== s) }) });
  for (const c of f.conditions)
    chips.push({ label: CONDITION_LABELS[c], href: without({ conditions: f.conditions.filter((x) => x !== c) }) });
  if (f.min !== null) chips.push({ label: `From ${formatINR(f.min)}`, href: without({ min: null }) });
  if (f.max !== null) chips.push({ label: `Up to ${formatINR(f.max)}`, href: without({ max: null }) });
  if (chips.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Active filters">
      {chips.map((c) => (
        <li key={c.label}>
          <Link href={c.href} className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-sm text-white">
            {c.label}
            <span aria-hidden="true">×</span>
            <span className="sr-only">(remove filter)</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ListingFallback() {
  return <p className="py-10 text-center text-muted">Loading items…</p>;
}
