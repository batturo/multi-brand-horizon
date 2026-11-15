import Link from "next/link";
import { store } from "@/config/store";
import { addressLines, formatPhone } from "@/lib/store-info";

const links = [
  ["/about", "About"],
  ["/visit", "Visit the store"],
  ["/delivery", "Delivery"],
  ["/returns", "Returns and exchanges"],
  ["/contact", "Contact"],
  ["/privacy", "Privacy"],
  ["/terms", "Terms"],
] as const;

/**
 * Footer with legal name, address, GSTIN and contact from config/store.ts.
 * Fields still marked TODO are left out rather than guessed.
 */
export function SiteFooter() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm leading-6 sm:grid-cols-2">
        <div>
          <p className="text-base font-semibold text-gold">{store.name}</p>
          {store.legalName && <p>{store.legalName}</p>}
          <address className="not-italic">
            {addressLines().map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </address>
          {store.gstin && <p>GSTIN: {store.gstin}</p>}
          <ul className="mt-3 space-y-1">
            {store.phones.map((p) => (
              <li key={p}>
                <a className="underline underline-offset-4 hover:text-gold" href={`tel:${p}`}>
                  {formatPhone(p)}
                </a>
              </li>
            ))}
            {store.email && (
              <li>
                <a className="underline underline-offset-4 hover:text-gold" href={`mailto:${store.email}`}>
                  {store.email}
                </a>
              </li>
            )}
            <li>
              <a className="underline underline-offset-4 hover:text-gold" href={store.instagramUrl} rel="noopener">
                Instagram
              </a>
            </li>
          </ul>
        </div>
        <nav aria-label="Shop information">
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
            {links.map(([href, label]) => (
              <li key={href}>
                <Link className="inline-block py-1 underline-offset-4 hover:text-gold hover:underline" href={href}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-8 text-xs text-white/70">
        All prices include taxes. Brand names describe the items we sell and belong to their owners.
      </p>
    </footer>
  );
}
