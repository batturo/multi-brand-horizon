import { store } from "@/config/store";

function formatPhone(e164: string): string {
  // +919041636322 -> +91 90416 36322
  const m = e164.match(/^\+91(\d{5})(\d{5})$/);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}

/**
 * Footer with legal name, address, GSTIN and contact from config/store.ts.
 * Fields still marked TODO are left out rather than guessed.
 */
export function SiteFooter() {
  const a = store.address;
  const addressLine = [a.street, a.locality, a.region, a.postalCode].filter(Boolean).join(", ");

  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm leading-6">
        <p className="text-base font-semibold text-gold">{store.name}</p>
        {store.legalName && <p>{store.legalName}</p>}
        <address className="not-italic">{addressLine}</address>
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
            <a
              className="underline underline-offset-4 hover:text-gold"
              href={store.instagramUrl}
              rel="noopener"
            >
              Instagram
            </a>
          </li>
        </ul>
        <p className="mt-6 text-xs text-white/70">
          All prices include taxes. Brand names describe the items we sell and belong to their
          owners.
        </p>
      </div>
    </footer>
  );
}
